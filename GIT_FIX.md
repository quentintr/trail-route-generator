# Correction des Problèmes Git

## Problèmes Résolus

### 1. Warnings LF/CRLF
**Solution appliquée :**
```bash
git config core.autocrlf true
```
Cette configuration convertit automatiquement les fins de ligne LF en CRLF lors du checkout sur Windows, et CRLF en LF lors du commit.

### 2. Erreur de Push (HTTP 408 - Timeout)
**Cause :** Fichiers très volumineux dans le commit (295.75 MiB) :
- Fichiers de cache OSM (`server/cache/*.json`) - très volumineux
- `server/package-lock.json` - peut être volumineux

**Solutions appliquées :**

1. **Ajout au `.gitignore` :**
   - `server/cache/` - Les fichiers de cache ne doivent pas être versionnés
   - `*.cache.json` - Pattern général pour les fichiers de cache

2. **Retrait des fichiers du suivi Git :**
   ```bash
   git rm --cached -r server/cache/
   git rm --cached server/package-lock.json
   ```

3. **Augmentation du buffer HTTP :**
   ```bash
   git config http.postBuffer 524288000  # 500 MB
   ```

## Prochaines Étapes

1. **Vérifier que le commit est prêt :**
   ```bash
   git status
   ```

2. **Faire le push :**
   ```bash
   git push
   ```

3. **Si le push échoue encore à cause de la taille :**
   - Option 1 : Utiliser Git LFS pour les gros fichiers
   - Option 2 : Augmenter le timeout côté serveur Git
   - Option 3 : Pousser en plusieurs commits plus petits

## Note sur les Fichiers de Cache

Les fichiers dans `server/cache/` sont des données OSM mises en cache. Ils ne doivent **jamais** être versionnés car :
- Ils sont très volumineux (plusieurs Mo chacun)
- Ils sont générés automatiquement
- Ils peuvent être régénérés à tout moment
- Ils polluent l'historique Git

## Note sur package-lock.json

Le fichier `package-lock.json` est généralement versionné dans les projets Node.js pour garantir la reproductibilité des builds. Cependant, si vous avez des problèmes de taille, vous pouvez :
- Le garder dans `.gitignore` (décommenter la ligne dans `.gitignore`)
- Ou utiliser Git LFS pour les gros fichiers

