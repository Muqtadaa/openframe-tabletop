/**
 * The sections of the prep shell's navigation.
 *
 * A list, so a phase that builds one (Actors, Journals, Encounters, a
 * Compendium) registers it here and the navigation grows; nothing is shown
 * for something that does not exist, because an inert entry is a claim the
 * product cannot back. Scenes are real today and are the only entry.
 */
export interface PrepSection {
  readonly id: string
  readonly label: string
}

export const PREP_SECTIONS: readonly PrepSection[] = [{ id: 'scenes', label: 'Scenes' }]
