export type Card = {
  id: string;
  title: string;
  aliases: string[];
  originalText: string;
  translation: string;
  explanation: string;
};

export type Game = {
  id: string;
  title: string;
  subtitle: string;
  version: string;
  cards: Card[];
};

export const DATA_VERSION = '1.0.0';

export const STORAGE_KEYS = {
  lastGame: 'brætspils:lastGame',
  customGames: 'brætspils:customGames',
  dataVersion: 'brætspils:dataVersion',
};

const baseCardsMagic: Card[] = [
  {
    id: 'giant-growth',
    title: 'Giant Growth',
    aliases: ['giant growth', 'giant', 'vækst'],
    originalText: 'Target creature gets +3/+3 until end of turn.',
    translation: 'Målrettet væsen får +3/+3 indtil slutningen af turen.',
    explanation:
      'Giver et væsen 3 ekstra angreb og 3 ekstra forsvar for resten af denne tur. Brug det til at vinde kampe eller beskytte nøglevæsner.',
  },
  {
    id: 'counterspell',
    title: 'Counterspell',
    aliases: ['counterspell', 'counter', 'neutraliser'],
    originalText: 'Counter target spell.',
    translation: 'Neutraliser målspell.',
    explanation:
      'Blokerer et modstanders spell, før det kan blive kastet. Brug det til at stoppe farlige triggered effekter og fjendtlige spells.',
  },
  {
    id: 'sol-ring',
    title: 'Sol Ring',
    aliases: ['sol ring', 'solring', 'ring'],
    originalText: 'T: Add {C}{C}.',
    translation: 'T: Tilføj {C}{C}.',
    explanation:
      'Generator-artefakt som giver to farveløse mana når den aktiveres. God til at accelerere dine spil tidligt.',
  },
];

const baseCardsDominion: Card[] = [
  {
    id: 'village',
    title: 'Village',
    aliases: ['village', 'landsby'],
    originalText: `+1 Card
+2 Actions`,
    translation: `+1 kort\n+2 handlinger`,
    explanation:
      'Træk et ekstra kort og få to ekstra handlinger. God til at bygge kombinationer, fordi du kan bruge flere handlingskort i samme tur.',
  },
  {
    id: 'smithy',
    title: 'Smithy',
    aliases: ['smithy', 'smed', 'smedje'],
    originalText: '+3 Cards',
    translation: '+3 kort',
    explanation:
      'Træk tre kort fra din bunke. Det giver dig mere at spille med, men ingen ekstra handlinger.',
  },
  {
    id: 'market',
    title: 'Market',
    aliases: ['market', 'marked'],
    originalText: `+1 Card
+1 Action
+1 Buy
+1 Coin`,
    translation: `+1 kort\n+1 handling\n+1 køb\n+1 mønt`,
    explanation:
      'Du trækker et kort og får både handling, køb og penge. En af de mest balancerede korttyper i Dominion.',
  },
];

export const BASE_GAMES: Game[] = [
  {
    id: 'magic',
    title: 'Magic: The Gathering',
    subtitle: 'Kortoversættelser og forklaringer',
    version: '1.0',
    cards: baseCardsMagic,
  },
  {
    id: 'dominion',
    title: 'Dominion',
    subtitle: 'Handlingskort og strategier',
    version: '1.0',
    cards: baseCardsDominion,
  },
];

export const normalizeQuery = (value: string) => value.trim().toLowerCase();

export const matchesCard = (card: Card, query: string) => {
  const normalized = normalizeQuery(query);
  if (!normalized) {
    return true;
  }

  if (card.title.toLowerCase().includes(normalized)) {
    return true;
  }

  if (card.aliases.some((alias) => alias.toLowerCase().includes(normalized))) {
    return true;
  }

  if (card.translation.toLowerCase().includes(normalized) || card.originalText.toLowerCase().includes(normalized)) {
    return true;
  }

  return false;
};

export const matchesGame = (game: Game, query: string) => {
  const normalized = normalizeQuery(query);
  if (!normalized) {
    return true;
  }

  return (
    game.title.toLowerCase().includes(normalized) ||
    game.subtitle.toLowerCase().includes(normalized) ||
    game.id.toLowerCase().includes(normalized)
  );
};

export const mergeCards = (baseCards: Card[], customCards: Card[]) => {
  const cardMap = new Map<string, Card>(baseCards.map((card) => [card.id, card]));

  for (const custom of customCards) {
    cardMap.set(custom.id, {
      ...cardMap.get(custom.id),
      ...custom,
      aliases: custom.aliases.length > 0 ? custom.aliases : cardMap.get(custom.id)?.aliases ?? [],
    });
  }

  return Array.from(cardMap.values());
};

export const mergeGames = (baseGames: Game[], customGames: Game[]) => {
  const customMap = new Map(customGames.map((game) => [game.id, game]));

  const mergedBase = baseGames.map((baseGame) => {
    const customGame = customMap.get(baseGame.id);
    if (!customGame) {
      return baseGame;
    }

    return {
      ...baseGame,
      title: customGame.title || baseGame.title,
      subtitle: customGame.subtitle || baseGame.subtitle,
      cards: mergeCards(baseGame.cards, customGame.cards),
    };
  });

  const customOnlyGames = customGames.filter((game) => !baseGames.some((base) => base.id === game.id));
  return [...mergedBase, ...customOnlyGames];
};

export const findCardAcrossGames = (games: Game[], query: string) => {
  const normalized = normalizeQuery(query);

  if (!normalized) {
    return [] as Array<{ game: Game; card: Card }>;
  }

  return games
    .flatMap((game) => game.cards.map((card) => ({ game, card })))
    .filter(({ card }) => matchesCard(card, normalized));
};

export const findCardInGame = (game: Game, query: string) => {
  const normalized = normalizeQuery(query);

  if (!normalized) {
    return [] as Array<{ game: Game; card: Card }>;
  }

  return game.cards
    .filter((card) => matchesCard(card, normalized))
    .map((card) => ({ game, card }));
};
