import { computed, effect, Injectable, signal } from '@angular/core';

export type Language = 'en' | 'et';

export const LANGUAGES: readonly { code: Language; name: string }[] = [
  { code: 'en', name: 'English' },
  { code: 'et', name: 'Eesti' },
];

const en = {
  languageLabel: 'Language',

  form: {
    title: 'Sector selection',
    intro:
      'Save your name and the sectors you work in. You can change your answers at any time during this session.',
    loading: 'Loading sectors, please wait.',
    loadError: 'Could not load form data. Please try again.',
    tryAgain: 'Try again',
    restored:
      'You saved this form earlier in this session. Change anything you like and save again.',
    allFieldsRequired: 'All fields are required.',
    correctFields: 'Please correct the highlighted fields.',
    nameLabel: 'Your name',
    termsLabel: 'Terms',
    termsSummary: 'What you are agreeing to',
    termsBody:
      'Saving stores your name, the sectors you select, and your acceptance of these terms, tied to your current browser session — you can come back and change it for as long as that session lasts. This form is a technical demonstration, so please do not enter anything you would not want stored in a demonstration database.',
    agreeLabel: 'I agree to the terms',
    save: 'Save',
    update: 'Update',
    saving: 'Saving...',
    savingStatus: 'Saving submission.',
    savedStatus: 'Submission saved.',
    saveError: 'The submission could not be saved. Please try again.',
  },

  selector: {
    legend: 'Sectors',
    help: 'Only the sectors inside a category can be selected.',
    nothingSelected: 'Nothing selected yet.',
    selectedCount: (count: number) => `${count} ${count === 1 ? 'sector' : 'sectors'} selected`,
    clearAll: 'Clear all',
    remove: (path: string) => `Remove ${path}`,
    showMore: (count: number) => `+${count} more`,
    showFewer: 'Show fewer',
    filterLabel: 'Filter sectors',
    filterPlaceholder: 'e.g. Printing, or Manufacturing › Wood',
    clearFilter: 'Clear',
    resultsFound: (count: number) => `${count} ${count === 1 ? 'sector' : 'sectors'} found.`,
    resultsAvailable: (count: number) =>
      `${count} ${count === 1 ? 'sector' : 'sectors'} available.`,
    expandAll: 'Expand all',
    collapseAll: 'Collapse all',
    noMatches: 'No sectors match your filter.',
  },

  errors: {
    nameRequired: 'Your name is required.',
    nameMaxLength: 'Name must not exceed 255 characters.',
    sectorsRequired: 'Choose at least one sector.',
    termsRequired: 'Please agree to the terms to continue.',
  },
};

export type Dictionary = typeof en;

const et: Dictionary = {
  languageLabel: 'Keel',

  form: {
    title: 'Sektorite valik',
    intro:
      'Salvestage oma nimi ja sektorid, milles tegutsete. Saate oma vastuseid selle sessiooni jooksul igal ajal muuta.',
    loading: 'Laadin sektoreid, palun oodake.',
    loadError: 'Vormi andmeid ei õnnestunud laadida. Palun proovige uuesti.',
    tryAgain: 'Proovi uuesti',
    restored:
      'Salvestasite selle vormi juba varem selles sessioonis. Muutke, mida soovite, ja salvestage uuesti.',
    allFieldsRequired: 'Kõik väljad on kohustuslikud.',
    correctFields: 'Palun parandage esile tõstetud väljad.',
    nameLabel: 'Teie nimi',
    termsLabel: 'Tingimused',
    termsSummary: 'Millega te nõustute',
    termsBody:
      'Salvestamisel säilitatakse teie nimi, valitud sektorid ja tingimustega nõustumine, seotuna teie praeguse brauserisessiooniga — saate naasta ja neid muuta seni, kuni see sessioon kestab. See vorm on tehniline näidis, seega ärge sisestage midagi, mida te ei sooviks näidisandmebaasi salvestada.',
    agreeLabel: 'Nõustun tingimustega',
    save: 'Salvesta',
    update: 'Uuenda',
    saving: 'Salvestan...',
    savingStatus: 'Salvestan andmeid.',
    savedStatus: 'Andmed salvestatud.',
    saveError: 'Andmeid ei õnnestunud salvestada. Palun proovige uuesti.',
  },

  selector: {
    legend: 'Sektorid',
    help: 'Valida saab ainult kategooria sees olevaid sektoreid.',
    nothingSelected: 'Midagi pole veel valitud.',
    selectedCount: (count: number) => `${count} ${count === 1 ? 'sektor' : 'sektorit'} valitud`,
    clearAll: 'Tühjenda kõik',
    remove: (path: string) => `Eemalda ${path}`,
    showMore: (count: number) => `+${count} veel`,
    showFewer: 'Näita vähem',
    filterLabel: 'Filtreeri sektoreid',
    // Sector names come from the database and exist only in English, so the
    // example has to stay in English to actually match something.
    filterPlaceholder: 'nt Printing või Manufacturing › Wood',
    clearFilter: 'Tühjenda',
    resultsFound: (count: number) => `Leitud ${count} ${count === 1 ? 'sektor' : 'sektorit'}.`,
    resultsAvailable: (count: number) =>
      `Saadaval ${count} ${count === 1 ? 'sektor' : 'sektorit'}.`,
    expandAll: 'Ava kõik',
    collapseAll: 'Sulge kõik',
    noMatches: 'Ükski sektor ei vasta filtrile.',
  },

  errors: {
    nameRequired: 'Nimi on kohustuslik.',
    nameMaxLength: 'Nimi ei tohi olla pikem kui 255 tähemärki.',
    sectorsRequired: 'Valige vähemalt üks sektor.',
    termsRequired: 'Jätkamiseks nõustuge palun tingimustega.',
  },
};

const DICTIONARIES: Record<Language, Dictionary> = { en, et };

@Injectable({ providedIn: 'root' })
export class Translations {
  readonly language = signal<Language>('en');

  readonly t = computed(() => DICTIONARIES[this.language()]);

  constructor() {
    // Assistive technology picks pronunciation from the document language, so
    // it has to follow the switcher rather than stay at the index.html default.
    effect(() => {
      document.documentElement.lang = this.language();
    });
  }
}
