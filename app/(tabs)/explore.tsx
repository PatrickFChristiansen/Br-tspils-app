import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ThemedText } from '../../components/themed-text';
import { Colors } from '../../constants/theme';
import { useColorScheme } from '../../hooks/use-color-scheme';
import {
  BASE_GAMES,
  Card,
  DATA_VERSION,
  Game,
  STORAGE_KEYS,
  findCardAcrossGames,
  findCardInGame,
  mergeGames,
  normalizeQuery,
} from '../data/games';
import { loadJSON, saveJSON } from '../utils/storage';

export default function ExploreScreen() {
  const colorScheme = useColorScheme();
  const tintColor = Colors[colorScheme ?? 'light'].tint;

  const [customGames, setCustomGames] = useState<Game[]>([]);
  const [games, setGames] = useState<Game[]>(BASE_GAMES);
  const [newGameTitle, setNewGameTitle] = useState('');
  const [newGameSubtitle, setNewGameSubtitle] = useState('');
  const [newCardGameId, setNewCardGameId] = useState(BASE_GAMES[0]?.id ?? '');
  const [newCardTitle, setNewCardTitle] = useState('');
  const [newCardAliases, setNewCardAliases] = useState('');
  const [newCardOriginal, setNewCardOriginal] = useState('');
  const [newCardTranslation, setNewCardTranslation] = useState('');
  const [newCardExplanation, setNewCardExplanation] = useState('');
  const [editGameId, setEditGameId] = useState(BASE_GAMES[0]?.id ?? '');
  const [editCardId, setEditCardId] = useState('');
  const [editTranslation, setEditTranslation] = useState('');
  const [scanGameId, setScanGameId] = useState(BASE_GAMES[0]?.id ?? '');
  const [scanText, setScanText] = useState('');
  const [scanResult, setScanResult] = useState<{ game: Game; card: Card }[]>([]);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraType, setCameraType] = useState<'back' | 'front'>('back');
  const cameraRef = useRef<CameraView | null>(null);

  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    async function loadState() {
      const custom = (await loadJSON<Game[]>(STORAGE_KEYS.customGames)) ?? [];
      const merged = mergeGames(BASE_GAMES, custom);
      setCustomGames(custom);
      setGames(merged);
      if (merged.length > 0) {
        setNewCardGameId(merged[0].id);
        setEditGameId(merged[0].id);
        setScanGameId(merged[0].id);
      }
    }

    loadState();
  }, []);

  const gameOptions = useMemo(() => games, [games]);
  const editGame = gameOptions.find((game) => game.id === editGameId) ?? null;
  const editCard = editGame?.cards.find((card) => card.id === editCardId) ?? null;
  const scanGame = gameOptions.find((game) => game.id === scanGameId) ?? null;

  useEffect(() => {
    if (editCard) {
      setEditTranslation(editCard.translation);
    }
  }, [editCard]);

  const saveCustomState = async (items: Game[]) => {
    await saveJSON(STORAGE_KEYS.customGames, items);
    setCustomGames(items);
    setGames(mergeGames(BASE_GAMES, items));
  };

  const createId = (value: string) => normalizeQuery(value).replace(/[^a-z0-9]+/g, '-');

  const handleCreateGame = async () => {
    const title = newGameTitle.trim();
    if (!title) {
      Alert.alert('Indtast et spilnavn');
      return;
    }

    const id = createId(title);
    if (games.some((game) => game.id === id)) {
      Alert.alert('Spillet findes allerede');
      return;
    }

    const nextGame: Game = {
      id,
      title,
      subtitle: newGameSubtitle.trim() || 'Nyt spil',
      version: '1.0',
      cards: [],
    };

    await saveCustomState([...customGames, nextGame]);
    setNewGameTitle('');
    setNewGameSubtitle('');
    setNewCardGameId(id);
    setEditGameId(id);
    Alert.alert('Spil tilføjet', `${title} er gemt lokalt.`);
  };

  const handleAddCard = async () => {
    const title = newCardTitle.trim();
    if (!title) {
      Alert.alert('Indtast et kortnavn');
      return;
    }

    const gameId = newCardGameId;
    const game = games.find((item) => item.id === gameId);
    if (!game) {
      Alert.alert('Vælg et spil først');
      return;
    }

    const id = createId(title);
    const card: Card = {
      id,
      title,
      aliases: newCardAliases
        .split(',')
        .map((alias) => alias.trim())
        .filter(Boolean),
      originalText: newCardOriginal.trim() || 'Ingen originaltekst',
      translation: newCardTranslation.trim() || 'Ingen oversættelse',
      explanation: newCardExplanation.trim() || 'Ingen forklaring',
    };

    const custom = [...customGames];
    const customGameIndex = custom.findIndex((item) => item.id === gameId);

    if (customGameIndex >= 0) {
      if (custom[customGameIndex].cards.find((item) => item.id === id)) {
        Alert.alert('Kort findes allerede');
        return;
      }
      custom[customGameIndex] = {
        ...custom[customGameIndex],
        cards: [...custom[customGameIndex].cards, card],
      };
    } else {
      custom.push({
        id: gameId,
        title: game.title,
        subtitle: game.subtitle,
        version: game.version,
        cards: [card],
      });
    }

    await saveCustomState(custom);
    setNewCardTitle('');
    setNewCardAliases('');
    setNewCardOriginal('');
    setNewCardTranslation('');
    setNewCardExplanation('');
    Alert.alert('Kort tilføjet', `${title} er gemt lokalt for ${game.title}.`);
  };

  const handleUpdateTranslation = async () => {
    if (!editGame || !editCard) {
      Alert.alert('Vælg et spil og et kort først');
      return;
    }

    const updatedTranslation = editTranslation.trim();
    if (!updatedTranslation) {
      Alert.alert('Indtast en oversættelse');
      return;
    }

    const custom = [...customGames];
    const customGameIndex = custom.findIndex((item) => item.id === editGame.id);
    const editedCard: Card = {
      ...editCard,
      translation: updatedTranslation,
    };

    if (customGameIndex >= 0) {
      const updatedCards = custom[customGameIndex].cards.filter((item) => item.id !== editCard.id);
      updatedCards.push(editedCard);
      custom[customGameIndex] = {
        ...custom[customGameIndex],
        cards: updatedCards,
      };
    } else {
      custom.push({
        id: editGame.id,
        title: editGame.title,
        subtitle: editGame.subtitle,
        version: editGame.version,
        cards: [editedCard],
      });
    }

    await saveCustomState(custom);
    Alert.alert('Oversættelse opdateret', `${editCard.title} bruger nu den nye danske tekst.`);
  };

  const handleScan = () => {
    const query = scanText.trim();
    if (!query) {
      Alert.alert('Indtast et kortnavn for scanning');
      return;
    }

    const results = scanGame ? findCardInGame(scanGame, query) : findCardAcrossGames(games, query);
    setScanResult(results);
    if (results.length === 0) {
      Alert.alert('Ingen match', 'Ingen kort kunne findes på baggrund af den scannede tekst.');
    }
  };

  const tryRecognizeTextFromImage = async (uri: string): Promise<string | undefined> => {
    try {
      const textModule = await import('expo-text-recognition');
      const recognize = textModule?.recognizeTextAsync ?? textModule?.default?.recognizeTextAsync;
      if (typeof recognize !== 'function') {
        return undefined;
      }

      const result = await recognize(uri);
      if (!result) {
        return undefined;
      }

      if (typeof result === 'string') {
        return result.trim();
      }

      const text = result?.text ?? result?.recognizedText ?? result?.value;
      if (typeof text === 'string' && text.trim()) {
        return text.trim();
      }

      if (Array.isArray(result?.blocks)) {
        return result.blocks.map((block: any) => block.text).filter(Boolean).join(' ').trim();
      }

      return undefined;
    } catch {
      return undefined;
    }
  };

  const handleCapturePhoto = async () => {
    if (!cameraRef.current) {
      Alert.alert('Kamera ikke klar', 'Vent venligst et øjeblik, og prøv igen.');
      return;
    }

    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.5, skipProcessing: true });
      setPhotoUri(photo.uri);
      setIsCameraOpen(false);

      const detectedText = await tryRecognizeTextFromImage(photo.uri);
      if (detectedText) {
        setScanText(detectedText);
        const results = scanGame ? findCardInGame(scanGame, detectedText) : findCardAcrossGames(games, detectedText);
        setScanResult(results);
        if (results.length === 0) {
          Alert.alert('Ingen match', 'Teksten blev genkendt, men intet kort matchede den valgte titel.');
        }
      } else {
        setScanText('');
        setScanResult([]);
        Alert.alert('Tekst ikke genkendt', 'Billedet blev gemt. Ret korttitlen manuelt og tryk Genkend kort.');
      }
    } catch (error) {
      Alert.alert('Fejl ved kamera', 'Kunne ikke tage billedet.');
    }
  };

  const toggleCamera = () => {
    setCameraType((value) => (value === 'back' ? 'front' : 'back'));
  };

  const scanMatchesLabel = useMemo(() => {
    if (!scanText.trim()) {
      return 'Tag et billede, ret den scannede titel og tryk Genkend kort.';
    }

    return `${scanResult.length} matchede kort`;
  }, [scanText, scanResult]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <ThemedText type="title" style={styles.title}>
          Admin & scanning
        </ThemedText>
        <ThemedText type="subtitle" style={styles.subtitle}>
          Tilføj nye spil, tilføj kort, og prøv kamera-scan flowet.
        </ThemedText>

        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Data & version
          </ThemedText>
          <ThemedText>Data version: {DATA_VERSION}</ThemedText>
          <ThemedText>{games.length} spil tilgængelige offline.</ThemedText>
          <ThemedText>{customGames.length} lokale spilændringer gemt.</ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Scanne kort
          </ThemedText>
          <ThemedText style={styles.subtitleText}>Vælg spil for at begrænse scanningen til den valgte kortsamling.</ThemedText>
          <View style={styles.gameSelector}>
            {gameOptions.map((game) => (
              <TouchableOpacity
                key={game.id}
                onPress={() => setScanGameId(game.id)}
                style={[styles.tile, scanGameId === game.id ? styles.selectedTile : undefined]}
              >
                <ThemedText>{game.title}</ThemedText>
              </TouchableOpacity>
            ))}
          </View>
          {permission?.granted ? (
            <>
              {isCameraOpen ? (
                <View style={styles.cameraCard}>
                  <CameraView
                    ref={cameraRef}
                    style={styles.cameraPreview}
                    facing={cameraType}
                  />
                  <View style={styles.cameraControls}>
                    <TouchableOpacity style={[styles.smallButton, { backgroundColor: tintColor }]} onPress={handleCapturePhoto}>
                      <ThemedText style={styles.buttonText}>Tag billede</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.smallButton, { backgroundColor: tintColor }]} onPress={toggleCamera}>
                      <ThemedText style={styles.buttonText}>Skift kamera</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.smallButton, { backgroundColor: '#666' }]} onPress={() => setIsCameraOpen(false)}>
                      <ThemedText style={styles.buttonText}>Luk kamera</ThemedText>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity style={[styles.button, { backgroundColor: tintColor }]} onPress={() => setIsCameraOpen(true)}>
                  <ThemedText style={styles.buttonText}>Åbn kamera</ThemedText>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <TouchableOpacity style={[styles.button, { backgroundColor: tintColor }]} onPress={requestPermission}>
              <ThemedText style={styles.buttonText}>Aktivér kamera</ThemedText>
            </TouchableOpacity>
          )}

          {photoUri ? (
            <View style={styles.previewContainer}>
              <Image source={{ uri: photoUri }} style={styles.previewImage} />
            </View>
          ) : null}

          <TextInput
            style={[styles.input, { borderColor: tintColor }]}
            placeholder="Ret korttitlen her efter scanning"
            placeholderTextColor={Colors[colorScheme ?? 'light'].icon}
            value={scanText}
            onChangeText={setScanText}
          />
          <TouchableOpacity style={[styles.button, { backgroundColor: tintColor }]} onPress={handleScan}>
            <ThemedText style={styles.buttonText}>Genkend kort</ThemedText>
          </TouchableOpacity>
          <ThemedText style={styles.smallCaption}>{scanMatchesLabel}</ThemedText>
          {scanResult.map(({ game, card }) => (
            <View key={`${game.id}-${card.id}`} style={styles.tile}>
              <ThemedText type="defaultSemiBold">{card.title}</ThemedText>
              <ThemedText style={styles.subtitleText}>{game.title}</ThemedText>
              <ThemedText style={styles.detailText}>{card.translation}</ThemedText>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Tilføj nyt spil
          </ThemedText>
          <TextInput
            style={[styles.input, { borderColor: tintColor }]}
            placeholder="Spilnavn"
            placeholderTextColor={Colors[colorScheme ?? 'light'].icon}
            value={newGameTitle}
            onChangeText={setNewGameTitle}
          />
          <TextInput
            style={[styles.input, { borderColor: tintColor }]}
            placeholder="Beskrivelse"
            placeholderTextColor={Colors[colorScheme ?? 'light'].icon}
            value={newGameSubtitle}
            onChangeText={setNewGameSubtitle}
          />
          <TouchableOpacity style={[styles.button, { backgroundColor: tintColor }]} onPress={handleCreateGame}>
            <ThemedText style={styles.buttonText}>Gem spil</ThemedText>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Tilføj nyt kort
          </ThemedText>
          <ThemedText style={styles.subtitleText}>Vælg spil</ThemedText>
          {gameOptions.map((game) => (
            <TouchableOpacity key={game.id} style={[styles.tile, newCardGameId === game.id ? styles.selectedTile : undefined]} onPress={() => setNewCardGameId(game.id)}>
              <ThemedText>{game.title}</ThemedText>
            </TouchableOpacity>
          ))}
          <TextInput
            style={[styles.input, { borderColor: tintColor }]}
            placeholder="Kortnavn"
            placeholderTextColor={Colors[colorScheme ?? 'light'].icon}
            value={newCardTitle}
            onChangeText={setNewCardTitle}
          />
          <TextInput
            style={[styles.input, { borderColor: tintColor }]}
            placeholder="Aliases (komma-separeret)"
            placeholderTextColor={Colors[colorScheme ?? 'light'].icon}
            value={newCardAliases}
            onChangeText={setNewCardAliases}
          />
          <TextInput
            style={[styles.input, { borderColor: tintColor }]}
            placeholder="Original tekst"
            placeholderTextColor={Colors[colorScheme ?? 'light'].icon}
            value={newCardOriginal}
            onChangeText={setNewCardOriginal}
          />
          <TextInput
            style={[styles.input, { borderColor: tintColor }]}
            placeholder="Dansk oversættelse"
            placeholderTextColor={Colors[colorScheme ?? 'light'].icon}
            value={newCardTranslation}
            onChangeText={setNewCardTranslation}
          />
          <TextInput
            style={[styles.input, { borderColor: tintColor }]}
            placeholder="Forklaring"
            placeholderTextColor={Colors[colorScheme ?? 'light'].icon}
            value={newCardExplanation}
            onChangeText={setNewCardExplanation}
          />
          <TouchableOpacity style={[styles.button, { backgroundColor: tintColor }]} onPress={handleAddCard}>
            <ThemedText style={styles.buttonText}>Gem kort</ThemedText>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Rediger oversættelse
          </ThemedText>
          <ThemedText style={styles.subtitleText}>Vælg spil</ThemedText>
          {gameOptions.map((game) => (
            <TouchableOpacity key={game.id} style={[styles.tile, editGameId === game.id ? styles.selectedTile : undefined]} onPress={() => { setEditGameId(game.id); setEditCardId(''); }}>
              <ThemedText>{game.title}</ThemedText>
            </TouchableOpacity>
          ))}

          {editGame ? (
            <>
              <ThemedText style={styles.subtitleText}>Vælg kort</ThemedText>
              {editGame.cards.map((card) => (
                <TouchableOpacity key={card.id} style={[styles.tile, editCardId === card.id ? styles.selectedTile : undefined]} onPress={() => setEditCardId(card.id)}>
                  <ThemedText>{card.title}</ThemedText>
                </TouchableOpacity>
              ))}
            </>
          ) : null}

          {editCard ? (
            <>
              <TextInput
                style={[styles.input, { borderColor: tintColor }]}
                placeholder="Ny oversættelse"
                placeholderTextColor={Colors[colorScheme ?? 'light'].icon}
                value={editTranslation}
                onChangeText={setEditTranslation}
              />
              <TouchableOpacity style={[styles.button, { backgroundColor: tintColor }]} onPress={handleUpdateTranslation}>
                <ThemedText style={styles.buttonText}>Opdater oversættelse</ThemedText>
              </TouchableOpacity>
            </>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fb',
  },
  container: {
    padding: 16,
    gap: 18,
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
    backgroundColor: '#ffffff',
  },
  tile: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e3e7ea',
    marginBottom: 10,
  },
  cameraCard: {
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#000',
    marginBottom: 12,
  },
  cameraPreview: {
    width: '100%',
    height: 260,
  },
  cameraControls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 12,
    backgroundColor: '#111',
  },
  gameSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  smallButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    minWidth: 100,
  },
  previewContainer: {
    borderRadius: 18,
    overflow: 'hidden',
    marginVertical: 12,
  },
  previewImage: {
    width: '100%',
    height: 200,
  },
  selectedTile: {
    borderColor: '#0a7ea4',
    backgroundColor: '#eef7fb',
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  subtitleText: {
    marginBottom: 6,
    color: '#656f7a',
  },
  detailText: {
    color: '#1b1f23',
    marginTop: 6,
  },
  smallCaption: {
    color: '#787e85',
    fontSize: 14,
  },
});
