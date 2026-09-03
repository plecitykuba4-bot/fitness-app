"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/server/db";
import { requireTrainer, requireOwnedTemplate } from "@/server/auth/guards";

/**
 * Správa šablon tréninků (workout builder).
 * Každá akce ověřuje, že šablona i použité cviky patří přihlášenému trenérovi.
 */

export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string | undefined>;
};

const GENERIC_ERROR = "Nepodařilo se uložit trénink. Zkuste to prosím znovu.";

const TemplateSchema = z.object({
  name: z.string().trim().min(2, "Zadejte název tréninku."),
  description: z.string().trim().max(300).optional(),
  estimatedMin: z
    .number()
    .int()
    .min(5, "Délka musí být alespoň 5 minut.")
    .max(300, "Délka nesmí přesáhnout 300 minut.")
    .nullable(),
  // Prázdné = šablona v knihovně trenéra, jinak trénink konkrétního klienta.
  clientId: z.string().trim().optional(),
});

export async function createTemplateAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const trainer = await requireTrainer();

  const rawMinutes = formData.get("estimatedMin");
  const rawClientId = formData.get("clientId");
  const parsed = TemplateSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    estimatedMin: rawMinutes ? Number(rawMinutes) : null,
    clientId:
      rawClientId === "__library__" ? undefined : rawClientId || undefined,
  });

  if (!parsed.success) {
    const f = parsed.error.flatten().fieldErrors;
    return {
      fieldErrors: { name: f.name?.[0], estimatedMin: f.estimatedMin?.[0] },
    };
  }

  // Klient musí patřit tomuto trenérovi.
  let clientId: string | null = null;
  if (parsed.data.clientId) {
    const client = await db.client.findFirst({
      where: { id: parsed.data.clientId, trainerId: trainer.trainerId },
      select: { id: true },
    });
    if (!client) return { fieldErrors: { clientId: "Klient nebyl nalezen." } };
    clientId = client.id;
  }

  let templateId: string;
  try {
    const created = await db.workoutTemplate.create({
      data: {
        trainerId: trainer.trainerId,
        clientId,
        name: parsed.data.name,
        description: parsed.data.description || null,
        estimatedMin: parsed.data.estimatedMin,
      },
    });
    templateId = created.id;
  } catch (error) {
    console.error("createTemplateAction", error);
    return {
      fieldErrors: { name: "Trénink s tímto názvem už tento klient má." },
    };
  }

  revalidatePath("/treninky");
  revalidatePath("/klienti");
  if (clientId) revalidatePath(`/klienti/${clientId}`);

  // Přišel-li trenér z rozpracovaného plánu, po dokončení cviků ho tam
  // vrátíme zpátky místo na obecný seznam tréninků.
  const navrat = formData.get("navrat");
  const query =
    typeof navrat === "string" && navrat.startsWith("/")
      ? `?navrat=${encodeURIComponent(navrat)}`
      : "";

  // Rovnou pokračuj do editoru, ať trenér může přidávat cviky.
  redirect(`/treninky/${templateId}${query}`);
}

/**
 * Zkopíruje trénink jinému klientovi (nebo z knihovny ke klientovi).
 * Trenér tak nemusí stavět stejnou sestavu znovu od nuly.
 */
export async function duplicateTemplateAction(
  templateId: string,
  targetClientId: string | null,
): Promise<{ ok: true; newId: string } | { ok: false; error: string }> {
  const trainer = await requireTrainer();

  const source = await db.workoutTemplate.findFirst({
    where: { id: templateId, trainerId: trainer.trainerId },
    include: {
      exercises: {
        orderBy: { sortOrder: "asc" },
        include: { sets: { orderBy: { setNumber: "asc" } } },
      },
    },
  });
  if (!source) return { ok: false, error: "Trénink nebyl nalezen." };

  if (targetClientId) {
    const client = await db.client.findFirst({
      where: { id: targetClientId, trainerId: trainer.trainerId },
      select: { id: true },
    });
    if (!client) return { ok: false, error: "Klient nebyl nalezen." };
  }

  // Název musí být v rámci cíle jedinečný — přidáme pořadové číslo.
  const baseName = source.name;
  let name = baseName;
  for (let attempt = 2; attempt <= 20; attempt++) {
    const clash = await db.workoutTemplate.findFirst({
      where: { trainerId: trainer.trainerId, clientId: targetClientId, name },
      select: { id: true },
    });
    if (!clash) break;
    name = `${baseName} (${attempt})`;
  }

  try {
    const created = await db.workoutTemplate.create({
      data: {
        trainerId: trainer.trainerId,
        clientId: targetClientId,
        name,
        description: source.description,
        estimatedMin: source.estimatedMin,
        exercises: {
          create: source.exercises.map((item) => ({
            exerciseId: item.exerciseId,
            sortOrder: item.sortOrder,
            restSeconds: item.restSeconds,
            tempo: item.tempo,
            note: item.note,
            sets: {
              create: item.sets.map((set) => ({
                setNumber: set.setNumber,
                reps: set.reps,
                targetWeight: set.targetWeight,
              })),
            },
          })),
        },
      },
    });

    revalidatePath("/treninky");
    revalidatePath("/klienti");
    if (targetClientId) revalidatePath(`/klienti/${targetClientId}`);
    return { ok: true, newId: created.id };
  } catch (error) {
    console.error("duplicateTemplateAction", error);
    return { ok: false, error: GENERIC_ERROR };
  }
}

const AddExerciseSchema = z.object({
  templateId: z.string().min(1),
  exerciseId: z.string().min(1, "Vyberte cvik."),
  sets: z.number().int().min(1).max(20),
  reps: z.number().int().min(1).max(3600),
  targetWeight: z.number().min(0).max(500).nullable(),
  restSeconds: z.number().int().min(0).max(600),
  note: z.string().trim().max(200).optional(),
});

export async function addTemplateExerciseAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const trainer = await requireTrainer();

  const rawWeight = formData.get("targetWeight");
  const parsed = AddExerciseSchema.safeParse({
    templateId: formData.get("templateId"),
    exerciseId: formData.get("exerciseId"),
    sets: Number(formData.get("sets")),
    reps: Number(formData.get("reps")),
    targetWeight: rawWeight ? Number(String(rawWeight).replace(",", ".")) : null,
    restSeconds: Number(formData.get("restSeconds")),
    note: formData.get("note") || undefined,
  });

  if (!parsed.success) {
    const f = parsed.error.flatten().fieldErrors;
    return {
      error: "Zkontrolujte zadané hodnoty.",
      fieldErrors: {
        exerciseId: f.exerciseId?.[0],
        sets: f.sets?.[0],
        reps: f.reps?.[0],
      },
    };
  }

  try {
    // Šablona musí patřit trenérovi.
    const template = await db.workoutTemplate.findFirst({
      where: { id: parsed.data.templateId, trainerId: trainer.trainerId },
      include: { exercises: { orderBy: { sortOrder: "desc" }, take: 1 } },
    });
    if (!template) return { error: "Trénink nebyl nalezen." };

    // Cvik musí patřit témuž trenérovi — jinak by šlo vložit cizí cvik.
    const exercise = await db.exercise.findFirst({
      where: { id: parsed.data.exerciseId, trainerId: trainer.trainerId },
      select: { id: true },
    });
    if (!exercise) return { fieldErrors: { exerciseId: "Cvik nebyl nalezen." } };

    const nextOrder = (template.exercises[0]?.sortOrder ?? -1) + 1;

    await db.workoutTemplateExercise.create({
      data: {
        templateId: template.id,
        exerciseId: exercise.id,
        sortOrder: nextOrder,
        restSeconds: parsed.data.restSeconds,
        note: parsed.data.note || null,
        // Všechny série stejné; trenér je pak může rozepsat jednotlivě.
        sets: {
          create: Array.from({ length: parsed.data.sets }, (_, index) => ({
            setNumber: index + 1,
            reps: parsed.data.reps,
            targetWeight: parsed.data.targetWeight,
          })),
        },
      },
    });
  } catch (error) {
    console.error("addTemplateExerciseAction", error);
    return { error: GENERIC_ERROR };
  }

  revalidatePath(`/treninky/${parsed.data.templateId}`);
  return {};
}

/**
 * Rychlé vložení cviku do plánu. Detail sérií se upravuje až přímo v jeho
 * řádku — trenér proto hodnoty nezadává dvakrát ve dvou různých formulářích.
 */
export async function quickAddTemplateExerciseAction(
  templateId: string,
  exerciseId: string,
): Promise<{ ok: true; itemId: string } | { ok: false; error: string }> {
  const trainer = await requireTrainer();

  const [template, exercise] = await Promise.all([
    db.workoutTemplate.findFirst({
      where: { id: templateId, trainerId: trainer.trainerId },
      include: { exercises: { orderBy: { sortOrder: "desc" }, take: 1 } },
    }),
    db.exercise.findFirst({
      where: { id: exerciseId, trainerId: trainer.trainerId },
      select: { id: true },
    }),
  ]);

  if (!template) return { ok: false, error: "Trénink nebyl nalezen." };
  if (!exercise) return { ok: false, error: "Cvik nebyl nalezen." };

  try {
    const item = await db.workoutTemplateExercise.create({
      data: {
        templateId: template.id,
        exerciseId: exercise.id,
        sortOrder: (template.exercises[0]?.sortOrder ?? -1) + 1,
        restSeconds: 90,
        sets: {
          create: Array.from({ length: 3 }, (_, index) => ({
            setNumber: index + 1,
            reps: 10,
            targetWeight: null,
          })),
        },
      },
      select: { id: true },
    });

    revalidatePath(`/treninky/${template.id}`);
    return { ok: true, itemId: item.id };
  } catch (error) {
    console.error("quickAddTemplateExerciseAction", error);
    return { ok: false, error: GENERIC_ERROR };
  }
}

/**
 * Přepsání parametrů cviku v tréninku.
 * Trenér typicky nepředělává celý trénink — jen posune váhu nebo série.
 */
export async function updateTemplateExerciseAction(
  itemId: string,
  values: {
    trackingType: "WEIGHT_REPS" | "TIME";
    restSeconds: number;
    note: string | null;
    sets: { reps: number; targetWeight: number | null }[];
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const trainer = await requireTrainer();

  const parsed = z
    .object({
      trackingType: z.enum(["WEIGHT_REPS", "TIME"]),
      restSeconds: z.number().int().min(0).max(600),
      note: z.string().trim().max(200).nullable(),
      sets: z
        .array(
          z.object({
            reps: z
              .number()
              .int()
              .min(1, "Alespoň 1 opakování.")
              .max(3600, "Hodnota je příliš vysoká."),
            targetWeight: z.number().min(0).max(500).nullable(),
          }),
        )
        .min(1, "Cvik musí mít alespoň jednu sérii.")
        .max(20, "Nejvýš 20 sérií."),
    })
    .safeParse(values);

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const item = await db.workoutTemplateExercise.findFirst({
    where: { id: itemId, template: { trainerId: trainer.trainerId } },
    select: { id: true, templateId: true, exerciseId: true },
  });
  if (!item) return { ok: false, error: "Cvik nebyl nalezen." };

  try {
    // Série přepisujeme celé — je to jednodušší i spolehlivější než
    // dopočítávat, které přibyly, ubyly nebo se změnily.
    await db.$transaction([
      db.exercise.update({
        where: { id: item.exerciseId },
        data: { trackingType: parsed.data.trackingType },
      }),
      db.workoutTemplateSet.deleteMany({
        where: { templateExerciseId: item.id },
      }),
      db.workoutTemplateExercise.update({
        where: { id: item.id },
        data: {
          restSeconds: parsed.data.restSeconds,
          note: parsed.data.note || null,
          sets: {
            create: parsed.data.sets.map((set, index) => ({
              setNumber: index + 1,
              reps: set.reps,
              targetWeight: set.targetWeight,
            })),
          },
        },
      }),
    ]);
  } catch (error) {
    console.error("updateTemplateExerciseAction", error);
    return { ok: false, error: GENERIC_ERROR };
  }

  revalidatePath(`/treninky/${item.templateId}`);
  return { ok: true };
}

export async function removeTemplateExerciseAction(
  itemId: string,
): Promise<void> {
  const trainer = await requireTrainer();

  const item = await db.workoutTemplateExercise.findFirst({
    where: { id: itemId, template: { trainerId: trainer.trainerId } },
    select: { id: true, templateId: true },
  });
  if (!item) return;

  await db.workoutTemplateExercise.delete({ where: { id: item.id } });
  await renumber(item.templateId);

  revalidatePath(`/treninky/${item.templateId}`);
}

/**
 * Posun cviku nahoru nebo dolů.
 * Drag & drop záměrně nepoužíváme — na mobilu se zpocenými prsty je
 * nespolehlivý a pro starší uživatele nečitelný.
 */
export async function moveTemplateExerciseAction(
  itemId: string,
  direction: "up" | "down",
): Promise<void> {
  const trainer = await requireTrainer();

  const item = await db.workoutTemplateExercise.findFirst({
    where: { id: itemId, template: { trainerId: trainer.trainerId } },
  });
  if (!item) return;

  const siblings = await db.workoutTemplateExercise.findMany({
    where: { templateId: item.templateId },
    orderBy: { sortOrder: "asc" },
  });

  const index = siblings.findIndex((s) => s.id === item.id);
  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= siblings.length) return;

  // Prohození pořadí přes dočasnou hodnotu — na (templateId, sortOrder)
  // je unikátní index, takže přímý swap by ho porušil.
  const other = siblings[target];
  await db.$transaction([
    db.workoutTemplateExercise.update({
      where: { id: item.id },
      data: { sortOrder: -1 },
    }),
    db.workoutTemplateExercise.update({
      where: { id: other.id },
      data: { sortOrder: item.sortOrder },
    }),
    db.workoutTemplateExercise.update({
      where: { id: item.id },
      data: { sortOrder: other.sortOrder },
    }),
  ]);

  revalidatePath(`/treninky/${item.templateId}`);
}

/**
 * Smaže celý trénink (šablonu). Dřívější odcvičené tréninky zůstávají —
 * mají vlastní kopii názvu a cviků, na šabloně nezávisí.
 */
export async function deleteTemplateAction(
  templateId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { template } = await requireOwnedTemplate(templateId);

  try {
    await db.workoutTemplate.delete({ where: { id: template.id } });
  } catch (error) {
    console.error("deleteTemplateAction", error);
    return { ok: false, error: GENERIC_ERROR };
  }

  revalidatePath("/treninky");
  if (template.clientId) revalidatePath(`/klienti/${template.clientId}`);
  return { ok: true };
}

/** Po smazání srovná pořadí, aby v číslování nezůstaly díry. */
async function renumber(templateId: string): Promise<void> {
  const items = await db.workoutTemplateExercise.findMany({
    where: { templateId },
    orderBy: { sortOrder: "asc" },
  });

  // Nejdřív do záporných hodnot, aby se neporušil unikátní index.
  await db.$transaction([
    ...items.map((item, i) =>
      db.workoutTemplateExercise.update({
        where: { id: item.id },
        data: { sortOrder: -(i + 1) },
      }),
    ),
    ...items.map((item, i) =>
      db.workoutTemplateExercise.update({
        where: { id: item.id },
        data: { sortOrder: i },
      }),
    ),
  ]);
}
