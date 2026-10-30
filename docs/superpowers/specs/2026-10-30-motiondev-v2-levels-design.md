# motiondev V2 : comprendre ce que l'agent construit, à son niveau

Date : 2026-10-30. Statut : proposition, à valider avant tout code. Remplace la direction "art v2" pour la fenêtre ; le protocole d'événements de la v0.1 reste la base.

## 1. La thèse

La v0.1 montre **ce que l'agent touche** (une scène, un objet, un nom). La V2 montre **ce que ça veut dire**, à la mesure de la personne qui regarde. Un seul flux d'événements, quatre lentilles.

Quatre idées portent tout le produit.

1. **La lentille est gratuite.** La classification et le rendu tournent dans les hooks et le mod, hors du modèle : zéro token, quel que soit le niveau. Ce qui coûte des tokens, c'est seulement ce qu'on demande à l'agent de dire (la narration `emit`, le mode apprentissage). La contrainte "peu de tokens" porte donc sur le texte que l'agent produit, jamais sur le visuel.
2. **Le débutant a besoin du fil, pas des objets.** Ce qui rassure et apprend, c'est le chemin : votre demande, puis le plan, puis les étapes, puis le résultat. L'agent écrit déjà son plan (`TodoWrite`, `TaskCreate`) ; la v0.1 le réduit à "3 todos". La V2 le remonte dans la fenêtre : une feuille de route tirée de la demande d'origine, sans un token de plus.
3. **Une seule carte mentale, quatre profondeurs.** Changer de niveau, c'est zoomer, pas changer de produit. Le débutant voit une métaphore, l'intermédiaire les vrais noms expliqués, le confirmé l'architecture, le dev le brut. C'est la divulgation progressive d'Apple : la même chose, plus ou moins de détail.
4. **Faux est pire que flou.** Une métaphore collée sur un événement mal classé apprend quelque chose de faux. Le niveau débutant n'affirme que ce dont le classifieur est sûr et retombe sur une phrase honnête ("Claude modifie le code de l'app") sinon.

## 2. Pour qui, pour quoi faire

| Niveau | Qui | Ce qu'il veut savoir | Ce qu'il ne veut pas voir |
|---|---|---|---|
| Débutant | fondateur, PM, designer, étudiant, curieux : ne code pas | "Est-ce qu'il fait ce que j'ai demandé ? Ça avance ? C'est quoi, ce truc qu'il fabrique ?" | chemins de fichiers, commandes, anglicismes non expliqués |
| Intermédiaire | sait lire un peu de code, no-code, junior | suivre l'architecture, apprendre le vocabulaire | le détail de chaque outil |
| Confirmé | développeur | superviser : quels fichiers, quelle structure, est-ce la bonne direction, voir les erreurs tôt | les métaphores, les phrases longues |
| Dev | power user | la télémétrie : chronologie des outils, fichiers, commandes, codes de sortie, tailles de diff, sous-agents | toute phrase |

## 3. Les quatre niveaux, sur trois moments réels

Le même événement, quatre rendus. Les textes sont produits localement par un dictionnaire de phrases (section 7), pas par le modèle.

**Moment A : `Write prisma/schema.prisma`, table `users (id, email, password_hash)`**

| Niveau | Pictogramme | Titre | Sous-titre / détail |
|---|---|---|---|
| Débutant | carnet | Claude prépare le carnet des inscrits | Pour que chacun puisse se connecter, l'app doit retenir son e-mail et son mot de passe, gardé secret. Étape 2 sur 5. |
| Intermédiaire | base de données | Création de la table users | Une table range les données en lignes : un utilisateur par ligne. Puces : id, email, password_hash. |
| Confirmé | base de données | database · table users | Prisma · prisma/schema.prisma, champs typés, place dans la carte UI → API → DB. |
| Dev | aucun | `Write prisma/schema.prisma +14 −0` | ligne de chronologie, durée, outil. |

**Moment B : `npm test`, 11 réussis, 1 échoué**

| Niveau | Rendu |
|---|---|
| Débutant | Claude vérifie que tout marche. Une vérification échoue : c'est normal, il corrige. |
| Intermédiaire | Tests automatiques : 11 réussis, 1 échoué. Claude va corriger. |
| Confirmé | tests · npm test · 11 ✓ 1 ✗ · auth.test.ts |
| Dev | `$ npm test → exit 1 · 4.2 s · 11 passed, 1 failed` |

**Moment C : `git commit -m "feat: users"`**

| Niveau | Rendu |
|---|---|
| Débutant | Claude enregistre une version de votre projet, comme une sauvegarde qui porte un nom. |
| Intermédiaire | Commit : une sauvegarde nommée dans l'historique du projet (feat: users). |
| Confirmé | git · commit a1b2c3 · feat: users · 4 fichiers |
| Dev | `git commit → a1b2c3 · +212 −8 · 4 files` |

Ce qui change d'un niveau à l'autre, au-delà des mots :

- **la granularité** : le débutant voit des chapitres (5 à 7 étapes par demande), le dev voit chaque appel d'outil ;
- **le vocabulaire** : liste de mots interdits par niveau, testée (un terme technique au niveau débutant doit venir avec son explication) ;
- **la densité visuelle** : une idée par écran au niveau débutant, une table dense au niveau dev ;
- **ce qui est mis en avant** : la demande et le plan en haut pour débutant et intermédiaire, l'architecture pour confirmé, la chronologie pour dev.

## 4. La métaphore du débutant

Une seule métaphore pour tout le produit, sinon on apprend six images contradictoires. Proposition : **le restaurant**.

| Partie technique | Dans le restaurant | Pourquoi ça marche |
|---|---|---|
| interface (frontend) | la salle | ce que le client voit et touche |
| serveur, API | la cuisine et le passe | là où les commandes sont préparées ; le passe est l'API : on y dépose une commande, on y reprend un plat |
| base de données | le garde-manger, le carnet de réservations | ce qu'on garde et retrouve |
| authentification | l'hôte à l'entrée | vérifie qui entre |
| tests | le contrôle qualité avant de servir | |
| git, commit | le cahier de recettes daté | chaque version est notée |
| dépendances | les fournisseurs | on ne fait pas son pain soi-même |
| déploiement | l'ouverture au public | |

Règle : la métaphore n'apparaît qu'au niveau débutant et seulement quand le classifieur est sûr de lui. L'intermédiaire nomme la vraie chose et rappelle l'image une fois ("l'API, le passe entre la salle et la cuisine"), puis la lâche.

## 5. L'onboarding : 30 secondes, deux questions, sautable

À la première ouverture de la fenêtre (aucun niveau enregistré) :

1. **"Vous codez ?"** quatre cartes : "Non, jamais" (Débutant), "Un peu" (Intermédiaire), "Oui" (Confirmé), "C'est mon métier, montre tout" (Dev).
2. Pour Débutant et Intermédiaire seulement : **"Voulez-vous apprendre en chemin ?"** "Juste suivre" ou "Apprendre" (avec le coût annoncé : "explications plus riches, environ 10 à 20 % de tokens en plus").

Puis un aperçu de trois secondes du même moment à leur niveau, et une ligne : "Changez quand vous voulez avec /motiondev level". La langue suit celle du système (`LANG`), modifiable.

Ensuite, le niveau reste à portée de main : un contrôle segmenté dans l'en-tête de la fenêtre (Débutant · Intermédiaire · Confirmé · Dev). Changer de niveau redessine instantanément depuis le même état : zéro token, zéro attente. C'est le geste "zoom" du produit.

Réglage enregistré au niveau de l'utilisateur, pas de la session. Surcharge par projet : pas en 2.0.

## 6. Le langage visuel

Principes : une idée par écran ; la hiérarchie vient du poids et de la taille du texte, pas de la couleur ; la couleur ne dit qu'un état ; le mouvement ne dit qu'un changement ; beaucoup d'air ; aucune décoration.

- **Typographie** : la pile système (`-apple-system, system-ui`, donc SF Pro sur Mac), SF Mono seulement au niveau dev. Quatre tailles : 13, 15, 20, 28. Deux graisses : regular et semibold.
- **Couleur** : les libellés en trois intensités (primaire, secondaire, tertiaire), qui marchent en clair et en sombre. Une seule couleur d'accent (bleu système) pour "en cours" ; vert pour fait, rouge pour échec, orange pour attention. Les couleurs par scène de la v0.1 (17 teintes) disparaissent de la vue principale ; au niveau dev elles restent en repère de 2 px pour balayer la chronologie.
- **Pictogrammes** : un jeu monoligne façon SF Symbols, trait de 1,5 px sur une grille de 24, une vingtaine de glyphes pour les scènes et une dizaine pour la métaphore. On ne peut pas embarquer SF Symbols (licence réservée aux plateformes Apple) : on dessine les nôtres ou on reprend les tracés d'un jeu sous licence permissive (Lucide ISC, Phosphor MIT, Tabler MIT), inlinés, avec la mention de licence.
- **Mouvement** : une seule courbe, l'ease-out d'Apple (`cubic-bezier(.32,.72,0,1)`), 240 à 400 ms pour les entrées ; au plus un élément vivant par vue (l'indicateur "en cours") ; une scène finie se fige (règle de la v0.1 conservée). Mouvement réduit respecté si le composant `Svg` du pane accepte une `<style>` avec `prefers-reduced-motion`, à vérifier.
- **Mise en page de la fenêtre**, de haut en bas :
  1. en-tête : projet, sélecteur de niveau ;
  2. "Votre demande" : la demande d'origine en une ligne (débutant, intermédiaire) ;
  3. le moment présent : pictogramme et une phrase au bon niveau ;
  4. le plan : les étapes de l'agent, cochées au fil de l'eau ;
  5. ce qui a été construit : des puces, nommées au bon niveau ;
  6. au niveau dev, les blocs 3 à 5 laissent place à la chronologie des outils, la liste des fichiers avec leurs +/−, le journal des commandes.
- **Terminal** : même structure en texte et en caractères de dessin de boîte ; le niveau change les mots et la granularité.

## 7. Architecture

Ce qui reste : le protocole `events.jsonl`, le classifieur pur, le mod sans Node, zéro dépendance.

Ce qui s'ajoute :

- `lib/explain.mjs` : `explain(event, state, { level, locale }) → { title, subtitle, glyph, chips, step }`, pur. Les textes vivent dans `lib/phrases/fr.mjs` et `lib/phrases/en.mjs` : un dictionnaire scène × objet × niveau, avec des gabarits (`{name}`, `{count}`).
- **Classifieur** : un champ `confidence` (`high`, `low`) ; un nouvel événement `plan` tiré de `TodoWrite` et `TaskCreate`/`TaskUpdate` (titres coupés à 60 caractères, statuts) ; pour le niveau dev, la taille des modifications (+/− lignes, calculée depuis l'entrée de l'outil, jamais le contenu stocké) et la durée.
- **État** (`reduce`) : `prompt` (la demande d'origine, une ligne), `plan` (les étapes), `stats` (par fichier). Nouveau tag de forme pour l'atome.
- **Réglages** : un atome `settings { level, locale, learn, onboarded }` à portée utilisateur. À vérifier : qu'un atome de mod peut persister hors session.
- **Rendu** : `lib/view.mjs` dessine la fenêtre V2 en SVG (en-tête, carte du moment, plan, étagère) ; `lib/svg.mjs` et `lib/compose.mjs` restent pour le terminal le temps de la transition.
- **Agnostique de l'agent** : le flux d'événements ne dépend pas de Claude Code. Un adaptateur Codex lit les sessions de `~/.codex/sessions/*.jsonl` et passe chaque appel au même classifieur (phase 3).

## 8. Le mode apprentissage (optionnel, consomme des tokens, pour apprendre)

Activé seulement si la personne l'a choisi ; sinon, les instructions correspondantes ne sont même pas chargées, donc zéro token.

- **Palier 1, "pourquoi"** : la skill demande à l'agent d'ajouter `--why "<une phrase pour un non-développeur>"` à chaque `emit`. Environ 25 tokens par unité de travail.
- **Palier 2, "la leçon du tour"** : à la fin d'un tour, l'agent écrit un récapitulatif structuré (5 étapes, une notion, une analogie, les mots nouveaux) que la fenêtre affiche en cinq cartes : "Ce que Claude vient de faire, en cinq images". Environ 300 à 600 tokens par tour.
- **Glossaire personnel** : chaque notion rencontrée (table, API, commit…) rejoint un glossaire avec une définition locale, tirée du dictionnaire : zéro token. "Vous avez rencontré 12 notions."
- **Coût affiché honnêtement** dans l'onboarding et dans l'en-tête ("Apprentissage · environ +15 % de tokens"), mesurable avec ponytail.
- **Mécanisme** : l'instruction d'apprentissage est injectée par un hook (`SessionStart` ou `UserPromptSubmit`) seulement quand le mode est actif. La skill de base reste courte (moins de 350 mots), parce qu'elle, elle coûte des tokens à chaque session.

## 8 bis. La version mod (construite)

Le système de mods de Claude Code (fonction hooks, `ui.render`, `$.state`, `$.store`, `$.model.fork`) porte toute la V2 sans serveur ni dépendance. Un premier mod complet existe : `motiondev-v2`, écrit dans le dossier des mods de la session et donc chargé à chaud.

- **Onboarding** : deux questions dans le pane, la seconde seulement pour Débutant et Intermédiaire ; réponses gardées dans `$.store`, donc posées une seule fois.
- **Sélecteur de niveau** dans l'en-tête, raccourcis 1 à 4 ; changer de niveau redessine depuis le même état.
- **Le fil** : la demande d'origine, puis le plan de l'agent tiré de `TodoWrite`, des outils `Task*` et de la liste de plan de l'app de bureau (`update_plan`) ; "Étape 2 sur 5" au niveau débutant.
- **Le moment** : une tuile de 48 px au trait façon SF Symbols (dessinée par nous) et le texte natif de l'app (tailles et graisses système, couleurs qui suivent le thème). La tuile ne respire que pendant une exécution ; `motion off` la fige.
- **Confirmé** : la bande d'architecture ui → api → données. **Dev** : la chronologie brute en monospace.
- **Apprentissage** : à la fin d'un tour, une question `$.model.fork` sur la transcription de la session (servie par le cache de prompt, hors du contexte de l'agent) écrit une leçon de cinq étapes ; le pane affiche son coût en tokens. Un bouton permet aussi de demander la leçon d'un tour sans activer le mode.
- **Commandes** : `/motiondev-v2 level …`, `learn on|off`, `lang fr|en`, `motion on|off`, `reset`, `close`.
- **Tests** : 9 tests de la logique pure (couverture du dictionnaire, absence de jargon au niveau débutant, longueurs, plan, tuile) et 5 tests du pane sous `claude plugin test`, sur le terminal et le bureau.

La suite naturelle : fusionner ce mod dans le plugin motiondev (il remplace la fenêtre actuelle), puis le publier par la marketplace existante.

## 8 ter. Ce que les outils de design apportent

- **open-design** : on n'utilise pas l'app, on reprend ses fichiers. Un `DESIGN.md` au format en 9 sections, amorcé par ses jetons Apple : gris `#1d1d1f`, `#6e6e73`, `#86868b`, `#d2d2d7`, `#f5f5f7`, un seul accent (`#0071e3` en clair, `#0a84ff` en sombre), mouvement de 150 à 220 ms. Ses règles d'artisanat deviennent des tests : animations de moins de 500 ms, boucles limitées, le mouvement jamais seul porteur d'un changement, icônes au trait de 1,6 à 1,8 px en `currentColor`, et les cinq états (chargement, vide, erreur, rempli, nom très long).
- **Discipline du mouvement** (skill animate d'open-design, d'après Emil Kowalski) : classer les animations par fréquence. Une mise à jour par appel d'outil doit être presque invisible ; on garde le moment marquant pour les événements rares (tests au vert, premier commit). Les sorties sont plus rapides que les entrées.
- **Apprendre avec des images fixes** : open-design cite Tversky (2002) : l'animation n'apprend pas mieux que des schémas fixes. Le mode apprentissage montre donc des schémas annotés, le mouvement servant seulement à signaler un changement.
- **ui-ux-pro-max** : ses données "Minimalism & Swiss Style", la règle d'animer un ou deux éléments par vue au plus, et sa checklist avant livraison (`pro-rules.md`). On écarte ses palettes sombres par défaut et ses presets GSAP.
- **impeccable** : pour la suite, `shape` avant de coder un écran, `onboard` pour le premier lancement, `distill` et `quieter` pour dépouiller, `clarify` pour les textes débutants, puis `critique`, `audit`, `polish`. Son détecteur ne lit que du HTML ou du JSX : on lui donnera un export HTML du pane.
- **Ressources de Brad Traversy** : pas de police embarquée (la pile système suffit, et les polices Apple ne se redistribuent pas) ; icônes Lucide (ISC), Phosphor ou Tabler (MIT) si l'on veut des tracés plutôt que les nôtres ; Open Peeps et Open Doodles (CC0) pour les illustrations du mode apprentissage.
- **MUI** : rien à prendre côté composants. Deux idées seulement : des sorties plus courtes que les entrées (225 ms contre 195 ms), et un réglage `reducedMotion` du type `never` ou `system`, que reprend `motion on|off`.
- **Points de vigilance** : ces skills de design se déclenchent sur le mot "design" dans chaque session et coûtent des milliers de tokens ; les règles de design restent dans le code et les tests, jamais dans la skill que l'agent lit. impeccable pousse vers une identité affirmée, l'inverse de la retenue Apple : on prend ses commandes de méthode, pas son goût. `prefers-reduced-motion` n'arrête pas les animations SMIL : d'où le réglage `motion` du mod.

## 9. Anti-objectifs

- Changer la façon dont l'agent répond dans le chat. motiondev explique dans sa fenêtre ; il ne transforme pas le travail de l'agent en cours.
- Du bruit : la lecture d'un fichier ne fait jamais bouger la vue principale (règle v0.1 conservée).
- Des visuels qui coûtent des tokens en mode productif.
- Material Design : c'est le langage de Google, à l'opposé du rendu Apple recherché, et le pane n'exécute pas React DOM. On ne prend pas MUI.

## 10. Comment on juge que c'est réussi

- **Test des cinq secondes** par niveau, avec une vraie personne de ce niveau : "que fait Claude, là ?" ; la réponse doit être juste.
- **Lint de vocabulaire** : liste de mots interdits par niveau, vérifiée dans `tests/`.
- **Budgets de longueur** : titre de 60 caractères au plus en débutant, 40 en confirmé ; sous-titre d'une phrase.
- **Revue visuelle** : passes `impeccable` (critique, audit, polish) et checklist ui-ux-pro-max ; contraste AA en clair et en sombre.
- **Zéro token** : tokens par tour avec et sans motiondev en mode productif, écart de 2 % au plus, mesuré avec ponytail.

## 11. Découpage

| Version | Contenu |
|---|---|
| 2.0 | quatre niveaux en français et en anglais, onboarding, sélecteur de niveau, nouveau langage visuel pour la carte du moment, demande d'origine, plan tiré de `TodoWrite` |
| 2.1 | niveau dev complet (chronologie, fichiers, commandes) ; carte d'architecture du niveau confirmé |
| 2.2 | mode apprentissage (pourquoi, leçon du tour, glossaire) |
| 2.3 | adaptateur Codex ; visionneuse web ou app Mac (encoche) |

## 12. Questions ouvertes

1. Noms des niveaux : "Débutant, Intermédiaire, Confirmé, Dev" ou des noms qui ne jugent pas la personne ("Découverte, Essentiel, Expert, Brut").
2. La métaphore du débutant : restaurant, ou autre (maison, ville, atelier).
3. Langues au lancement : français et anglais.
4. La banque de composants : laquelle, et sous quelle forme (tracés SVG, jetons de design, ou seulement une inspiration).
5. Le nom "motiondev" sonne développeur pour un public débutant : le garder ou prévoir un nom produit.
