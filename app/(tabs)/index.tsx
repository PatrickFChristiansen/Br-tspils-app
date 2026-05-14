import { useIsFocused } from '@react-navigation/native';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { ThemedText } from '../../components/themed-text';
import { ThemedView } from '../../components/themed-view';
import { Colors } from '../../constants/theme';
import { useColorScheme } from '../../hooks/use-color-scheme';
import {
  BASE_GAMES,
  Card,
  DATA_VERSION,
  Game,
  STORAGE_KEYS,
  matchesCard,
  matchesGame,
  mergeGames,
  normalizeQuery,
} from '../data/games';
import { loadJSON, saveJSON } from '../utils/storage';

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const tintColor = theme.tint;

  const [games, setGames] = useState<Game[]>(BASE_GAMES);
  const [loading, setLoading] = useState(true);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [gameQuery, setGameQuery] = useState('');
  const [cardQuery, setCardQuery] = useState('');
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('Offline klar. Vælg et spil for at komme i gang.');
  const isFocused = useIsFocused();

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    async function loadState() {
      const customGames = (await loadJSON<Game[]>(STORAGE_KEYS.customGames)) ?? [];
      const merged = mergeGames(BASE_GAMES, customGames);
      setGames(merged);

      const lastGame = await loadJSON<string>(STORAGE_KEYS.lastGame);
      if (lastGame && merged.some((game) => game.id === lastGame)) {
        setSelectedGameId(lastGame);
      } else if (merged.length > 0) {
        setSelectedGameId(merged[0].id);
      }
      setLoading(false);
    }

    loadState();
  }, [isFocused]);

  const selectedGame = useMemo(
    () => games.find((game) => game.id === selectedGameId) ?? null,
    [games, selectedGameId],
  );

  const filteredGames = useMemo(
    () => games.filter((game) => matchesGame(game, gameQuery)),
    [games, gameQuery],
  );

  const filteredCards = useMemo(() => {
    if (!selectedGame) {
      return [];
    }

    const trimmed = normalizeQuery(cardQuery);
    if (!trimmed) {
      return selectedGame.cards.slice(0, 12);
    }

    return selectedGame.cards.filter((card) => matchesCard(card, trimmed));
  }, [cardQuery, selectedGame]);

  const handleSelectGame = async (gameId: string) => {
    setSelectedGameId(gameId);
    setSelectedCard(null);
    setCardQuery('');
    setStatusMessage('Vælg et kort eller start en søgning.');
    await saveJSON(STORAGE_KEYS.lastGame, gameId);
  };

  const handleSelectCard = (card: Card) => {
    setSelectedCard(card);
    setStatusMessage('Kort fundet. Se detaljer nedenfor.');
  };

  const handleCardSearchChange = (value: string) => {
    setCardQuery(value);
    setSelectedCard(null);
    if (value.trim().length === 0) {
      setStatusMessage('Skriv et kortnavn for at få forslag.');
    } else {
      setStatusMessage('Søger...');
    }
  };

  if (loading) {
    return (
      <ThemedView style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={tintColor} />
        <ThemedText type="subtitle" style={styles.loadingText}>
          Indlæser kortdata...
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={80}
      >
        <ScrollView style={styles.flex} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <ThemedText type="title" style={styles.title}>
            Brætspils Kort Hjælper 🎲
          </ThemedText>
          <ThemedText type="subtitle" style={styles.subtitle}>
            Offline kortsøgning og danske forklaringer
          </ThemedText>

          <View style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              1. Vælg spil
            </ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: theme.cardBackground, borderColor: theme.border, color: theme.text }]}
              placeholder="Søg efter spil"
              placeholderTextColor={theme.icon}
              value={gameQuery}
              onChangeText={setGameQuery}
              accessibilityLabel="Søg efter spil"
            />
            <FlatList
              data={filteredGames}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.tile,
                    { backgroundColor: theme.cardBackground, borderColor: theme.border },
                    item.id === selectedGameId && { borderColor: theme.tint, backgroundColor: theme.selectedBackground },
                  ]}
                  onPress={() => handleSelectGame(item.id)}
                  accessibilityRole="button"
                >
                  <ThemedText type="defaultSemiBold">{item.title}</ThemedText>
                  <ThemedText style={styles.subtitleText}>{item.subtitle}</ThemedText>
                </TouchableOpacity>
              )}
              ListEmptyComponent={() => (
                <ThemedText style={styles.emptyText}>Ingen spil fundet med det navn.</ThemedText>
              )}
              scrollEnabled={false}
            />
          </View>

          {selectedGame ? (
            <View style={styles.section}>
              <View style={styles.cardHeaderRow}>
                <ThemedText type="subtitle" style={styles.sectionTitle}>
                  2. Søg i {selectedGame.title}
                </ThemedText>
                <ThemedText style={styles.smallCaption}>Version {selectedGame.version}</ThemedText>
              </View>
              <TextInput
                style={[styles.input, { backgroundColor: theme.cardBackground, borderColor: theme.border, color: theme.text }]}
                placeholder="Skriv kortnavn eller alias"
                placeholderTextColor={theme.icon}
                value={cardQuery}
                onChangeText={handleCardSearchChange}
                accessibilityLabel="Søg efter kort"
              />
              <FlatList
                data={filteredCards}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity style={[styles.tile, { backgroundColor: theme.cardBackground, borderColor: theme.border }]} onPress={() => handleSelectCard(item)}>
                    <ThemedText type="defaultSemiBold">{item.title}</ThemedText>
                    <ThemedText style={styles.subtitleText}>{item.aliases.join(', ')}</ThemedText>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={() => (
                  <ThemedText style={styles.emptyText}>Ingen kort fundet. Prøv en anden stavemåde.</ThemedText>
                )}
                scrollEnabled={false}
              />
            </View>
          ) : null}

          {selectedCard ? (
            <View style={styles.section}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                3. Kortdetaljer
              </ThemedText>
              <View style={[styles.detailCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                <ThemedText type="title">{selectedCard.title}</ThemedText>
                <ThemedText style={styles.detailLabel}>Original tekst</ThemedText>
                <ThemedText style={styles.detailText}>{selectedCard.originalText}</ThemedText>
                <ThemedText style={styles.detailLabel}>Dansk oversættelse</ThemedText>
                <ThemedText style={styles.detailText}>{selectedCard.translation}</ThemedText>
                <ThemedText style={styles.detailLabel}>Forklaring</ThemedText>
                <ThemedText style={styles.detailText}>{selectedCard.explanation}</ThemedText>
              </View>
            </View>
          ) : null}

          <View style={[styles.statusBar, { backgroundColor: theme.statusBackground }]}> 
            <ThemedText style={styles.statusText}>{statusMessage}</ThemedText>
            <ThemedText style={styles.smallCaption}>Data version: {DATA_VERSION} · Offline</ThemedText>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  container: {
    padding: 16,
    gap: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
  },
  title: {
    marginBottom: 6,
  },
  subtitle: {
    marginBottom: 14,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  tile: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  selectedTile: {
  },
  subtitleText: {
    marginTop: 6,
  },
  emptyText: {
    fontSize: 16,
  },
  detailCard: {
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
  },
  detailLabel: {
    marginTop: 12,
    fontWeight: '600',
  },
  detailText: {
    marginTop: 6,
    lineHeight: 22,
  },
  statusBar: {
    marginTop: 10,
    padding: 14,
    borderRadius: 16,
  },
  statusText: {
  },
  smallCaption: {
    fontSize: 14,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
