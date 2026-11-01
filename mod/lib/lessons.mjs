// The notions behind what Claude builds, told with one picture: the app is a
// restaurant. Each notion has its room (the picture), its real name (the term),
// what it is in the person's own project, and where the picture stops being true.
// The quiz asks about their project first, then about the notion in general.
// Local text: learning costs no token. Every answer list puts the right answer
// first, all three about the same length; quiz() moves the right one around.

// The learning path, in the order a web app usually gets built.
export const CONCEPTS = ['interface', 'database', 'api', 'auth', 'tests', 'git', 'deps', 'config', 'deploy']

const BY_SCENE = { frontend: 'interface', database: 'database', api: 'api', auth: 'auth', tests: 'tests', git: 'git', deps: 'deps', config: 'config', infra: 'deploy' }
export const conceptOf = scene => BY_SCENE[scene] ?? null
// What can stand for a notion in a lesson: a table, not any database command; a route, not any server file.
const KINDS = { api: /route|endpoint/, database: /table|migration|seed|index/, git: /commit/, deploy: /deploy/ }
export const stands = (id, item) => Boolean(item) && conceptOf(item.scene) === id && (!KINDS[id] || KINDS[id].test(item.object ?? ''))

// `here` lists templates from the most specific: the first whose fields are all known is used.
export const LESSONS = {
  fr: {
    interface: {
      title: 'L’interface', room: 'La salle', short: 'Écran',
      image: 'La salle du restaurant : tout ce que le visiteur voit et touche. On la meuble avec des briques réutilisables.',
      what: 'L’interface (le front-end) est ce qui s’affiche à l’écran. Elle est faite de composants : des briques d’écran réutilisables.',
      here: ['« {name} » est une de ces briques : votre app l’affichera dans la salle.'],
      limit: 'Sauf que la salle tourne sur l’appareil du visiteur : y cacher un bouton ne protège rien, la cuisine doit tout revérifier.',
      ask: { q: 'Où « {name} » va-t-il apparaître ?', a: ['À l’écran, devant le visiteur', 'Dans la base, rangé en lignes', 'Dans le carnet des versions'], why: '« {name} » est un composant : une brique de la salle, que le visiteur voit à l’écran.' },
      quiz: [
        { q: 'Un composant, c’est…', a: ['Une brique d’écran réutilisable', 'Une ligne de la base de données', 'Une sauvegarde nommée du projet'], why: 'Un composant est un morceau d’écran qu’on assemble avec d’autres et qu’on réutilise.' },
        { q: 'Pourquoi découper l’écran en composants ?', a: ['Pour changer une partie sans casser le reste', 'Pour que l’app se connecte à internet', 'Pour cacher les mots de passe des membres'], why: 'Chaque brique vit à part : on la modifie ou on la réutilise sans toucher au reste.' },
      ],
    },
    database: {
      title: 'La base de données', room: 'La réserve', short: 'Données',
      image: 'La réserve : des registres où l’app note tout ce qu’elle doit retenir, une ligne par élément.',
      what: 'Une base de données garde les informations même quand l’app s’éteint. Elle les range en tables : une ligne par élément, une colonne par information.',
      here: ['La table « {name} » aura une ligne par élément, avec ces colonnes : {detail}.', 'La table « {name} » aura une ligne par élément.'],
      limit: 'Sauf qu’une vraie base retrouve une ligne parmi des millions en un instant, et que plusieurs visiteurs y écrivent en même temps.',
      ask: { q: 'L’app doit retrouver une information de « {name} ». Où regarde-t-elle ?', a: ['Dans la table « {name} »', 'Dans le code de l’écran', 'Dans le carnet des versions'], why: 'Les informations durables vivent dans la base : la table « {name} » les garde, une ligne par élément.' },
      quiz: [
        { q: 'Dans une table de membres, une ligne représente…', a: ['Un membre et ses informations', 'Une seule information, l’e-mail', 'Une page entière de l’application'], why: 'Une ligne est un élément complet, ici un membre. Les colonnes sont ses informations : e-mail, nom…' },
        { q: 'Pourquoi garder les données dans une base ?', a: ['Pour les retrouver après un redémarrage', 'Pour que l’écran s’affiche plus vite', 'Pour écrire moins de code d’interface'], why: 'Sans base, tout disparaît quand l’app s’arrête. La base garde les informations durablement.' },
      ],
    },
    api: {
      title: 'L’API', room: 'Le comptoir', short: 'API',
      image: 'Le comptoir entre la salle et la cuisine : la salle y passe commande, la cuisine y renvoie le plat.',
      what: 'Une API est la liste des demandes qu’on peut faire au serveur. Chaque demande a une adresse, appelée route, comme /users.',
      here: ['La route « {name} » répond quand l’écran demande ces informations.'],
      limit: 'Sauf qu’ici tout est codifié : une commande mal formée est refusée, et chaque réponse porte un code (200 servi, 404 introuvable).',
      ask: { q: 'L’écran a besoin des informations de « {name} ». Que fait-il ?', a: ['Il appelle la route {name}', 'Il ouvre le fichier .env', 'Il relance tous les tests'], why: 'L’écran ne lit jamais la base lui-même : il passe commande à l’API, qui va chercher et renvoie.' },
      quiz: [
        { q: 'L’écran demande la liste des membres. Que fait l’API ?', a: ['Elle la cherche et la renvoie', 'Elle dessine la liste à l’écran', 'Elle enregistre une version'], why: 'L’API reçoit la commande, va chercher les données et renvoie la réponse. L’écran se charge de l’afficher.' },
        { q: 'Dans « GET /users », que veut dire GET ?', a: ['On veut lire des données', 'On veut effacer des données', 'On veut dessiner une page'], why: 'GET demande à lire. Pour créer on utilise POST, pour supprimer DELETE.' },
      ],
    },
    auth: {
      title: 'L’accès', room: 'L’accueil', short: 'Accès',
      image: 'L’accueil à l’entrée : on vérifie qui vous êtes avant de vous laisser entrer, puis où vous avez le droit d’aller.',
      what: 'L’authentification vérifie qui vous êtes (la connexion). L’autorisation décide ensuite ce que vous avez le droit de faire.',
      here: ['« {name} » fait ce contrôle à l’entrée de votre app.'],
      limit: 'Sauf que l’app ne garde jamais votre mot de passe : seulement son empreinte (un hash), qu’elle compare.',
      ask: { q: 'Un visiteur tape un mauvais mot de passe. Qui l’arrête ?', a: ['Le contrôle « {name} »', 'La liste des membres', 'Le carnet des versions'], why: '« {name} » compare ce qui est tapé avec l’empreinte gardée : si elles diffèrent, la porte reste fermée.' },
      quiz: [
        { q: 'Pourquoi un mot de passe est-il stocké « haché » ?', a: ['Pour que personne ne puisse le relire', 'Pour qu’il prenne moins de place', 'Pour que la connexion aille plus vite'], why: 'Un hash ne se relit pas : même si la base fuit, les mots de passe restent illisibles.' },
        { q: 'Se connecter, puis ouvrir une page réservée aux admins : dans quel ordre ?', a: ['Authentifier, puis autoriser', 'Autoriser, puis authentifier', 'Tester, puis mettre en ligne'], why: 'D’abord on vérifie qui vous êtes, ensuite ce que vous avez le droit de faire.' },
      ],
    },
    tests: {
      title: 'Les tests', room: 'La dégustation', short: 'Tests',
      image: 'La dégustation : avant de servir, on goûte chaque plat selon la recette. Un test goûte une partie de l’app.',
      what: 'Un test est un petit programme qui vérifie un comportement précis. On les relance après chaque changement pour voir ce qui casse.',
      here: ['Résultat chez vous : {detail}.', 'Claude les relance pour prouver que votre app fait ce que vous avez demandé.'],
      hereFail: 'Un test a échoué : c’est son rôle. Il a attrapé l’erreur avant vos visiteurs.',
      limit: 'Sauf qu’un test ne vérifie que ce qu’on lui demande : tout vert ne veut pas dire zéro bug.',
      quiz: [
        { q: 'Un test échoue pendant que Claude travaille. C’est…', a: ['Utile : il signale un problème', 'Grave : tout le projet est perdu', 'Sans importance : on l’ignore'], why: 'Un test qui échoue a fait son travail : il a trouvé un problème avant les visiteurs.' },
        { q: 'Tous les tests passent. Cela veut dire…', a: ['Ce qui est vérifié marche', 'L’app n’a plus aucun bug', 'L’app est déjà en ligne'], why: 'Un test ne vérifie que ce qu’on lui demande : ce qui n’est pas testé peut encore casser.' },
      ],
    },
    git: {
      title: 'Les versions', room: 'Le carnet', short: 'Versions',
      image: 'Le carnet de recettes : chaque fois qu’une recette marche, on la note avec la date. On peut toujours revenir à une ancienne.',
      what: 'Git garde l’historique du projet. Un commit est une sauvegarde nommée de tous les fichiers à un instant.',
      here: ['Le commit « {name} » ajoute une page au carnet de votre projet.'],
      limit: 'Sauf que le carnet reste sur votre ordinateur tant qu’on ne l’envoie pas en ligne (un push).',
      ask: { q: 'Que garde le commit « {name} » ?', a: ['L’état du projet à ce moment', 'La liste des visiteurs du jour', 'Le mot de passe de l’admin'], why: 'Un commit est une photo de tous les fichiers : on pourra revenir à cet état exact.' },
      quiz: [
        { q: 'Un commit, c’est…', a: ['Une sauvegarde nommée du projet', 'Un message envoyé aux visiteurs', 'Un test lancé automatiquement'], why: 'Un commit enregistre l’état du projet avec un message qui dit ce qui a changé.' },
        { q: 'Une modification casse l’app. Grâce aux commits, on peut…', a: ['Revenir à la version d’avant', 'Supprimer tous les membres', 'Changer de langage de code'], why: 'Chaque commit est un point de retour : on compare, on revient, rien n’est perdu.' },
      ],
    },
    deps: {
      title: 'Les dépendances', room: 'Les fournisseurs', short: 'Outils',
      image: 'Les fournisseurs : un restaurant n’élève pas ses poules, il achète des ingrédients tout prêts. Ici, ce sont des morceaux de code.',
      what: 'Une dépendance est une bibliothèque de code écrite par d’autres, installée avec un gestionnaire comme npm. La liste est dans package.json.',
      here: ['« {name} » arrive tout prêt : Claude n’a pas à l’écrire.'],
      limit: 'Sauf que chaque fournisseur a ses propres fournisseurs : une seule pièce cassée peut tout bloquer.',
      ask: { q: 'D’où vient le code de « {name} » ?', a: ['D’autres développeurs, en ligne', 'De Claude, qui l’a écrit ici', 'De la base de données de l’app'], why: '« {name} » est une bibliothèque publique : npm l’a téléchargée dans votre projet.' },
      quiz: [
        { q: 'Pourquoi utiliser une dépendance ?', a: ['Pour ne pas réécrire ce qui existe', 'Pour que l’app tourne plus vite', 'Pour cacher le code aux visiteurs'], why: 'On réutilise du code éprouvé au lieu de tout réécrire.' },
        { q: 'Où est la liste des dépendances d’un projet JavaScript ?', a: ['Dans le fichier package.json', 'Dans la table des membres', 'Dans le fichier de l’écran'], why: 'package.json liste chaque dépendance et sa version : npm s’en sert pour tout réinstaller.' },
      ],
    },
    config: {
      title: 'Les réglages', room: 'Le coffre', short: 'Réglages',
      image: 'Le coffre du bureau : les clés et les codes secrets n’ont rien à faire sur le menu. On les range à part.',
      what: 'Les variables d’environnement (le fichier .env) gardent réglages et secrets hors du code, pour ne jamais les publier.',
      here: ['« {name} » range ces réglages à part du code.'],
      limit: 'Sauf qu’un secret envoyé une seule fois sur GitHub reste dans l’historique : il faut alors le changer.',
      quiz: [
        { q: 'Pourquoi garder une clé secrète dans .env ?', a: ['Pour ne pas la publier avec le code', 'Pour qu’elle s’affiche à l’écran', 'Pour que les tests aillent plus vite'], why: 'Le code se partage, les secrets non : .env reste sur la machine et hors de Git.' },
        { q: 'Le même code tourne chez vous et en ligne. Qu’est-ce qui change ?', a: ['Les réglages de l’environnement', 'Le langage du code source', 'Le nom de chaque composant'], why: 'Le code est identique ; seuls les réglages (adresse de la base, clés…) changent d’un endroit à l’autre.' },
      ],
    },
    deploy: {
      title: 'La mise en ligne', room: 'L’ouverture', short: 'En ligne',
      image: 'L’ouverture au public : jusqu’ici on cuisinait en privé. On allume l’enseigne et tout le monde peut entrer.',
      what: 'Déployer, c’est installer l’app sur un serveur en ligne, pour qu’elle réponde à une adresse publique.',
      here: ['« {name} » décrit comment votre app part en ligne.'],
      limit: 'Sauf que le site en ligne est la copie d’une version précise : vos changements n’y sont qu’au prochain déploiement.',
      quiz: [
        { q: 'Avant le déploiement, qui peut utiliser l’app ?', a: ['Seulement vous, sur votre ordinateur', 'Tout le monde, à son adresse', 'Personne : elle n’existe pas encore'], why: 'Tant qu’elle tourne sur votre ordinateur, l’app est une cuisine privée.' },
        { q: 'Que faut-il garder hors du code avant de déployer ?', a: ['Les clés et les mots de passe', 'Les noms des composants', 'Les messages de commit'], why: 'Les secrets vont dans les réglages du serveur, jamais dans le code publié.' },
      ],
    },
  },
  en: {
    interface: {
      title: 'The interface', room: 'The dining room', short: 'Screen',
      image: 'The dining room: everything visitors see and touch. It is furnished with reusable pieces.',
      what: 'The interface (the front end) is what shows on screen. It is built from components: reusable pieces of screen.',
      here: ['“{name}” is one of those pieces: your app will show it in the dining room.'],
      limit: 'Except the dining room runs on the visitor’s device: hiding a button there protects nothing, the kitchen must check again.',
      ask: { q: 'Where will “{name}” appear?', a: ['On screen, in front of visitors', 'In the database, stored in rows', 'In the book of saved versions'], why: '“{name}” is a component: a piece of the dining room that visitors see on screen.' },
      quiz: [
        { q: 'A component is…', a: ['A reusable piece of screen', 'One row in the database', 'A named save of the project'], why: 'A component is a piece of screen you combine with others and reuse.' },
        { q: 'Why split a screen into components?', a: ['To change one part without breaking the rest', 'To let the app connect to the internet', 'To hide passwords from the visitors’ view'], why: 'Each piece lives on its own: you change or reuse it without touching the rest.' },
      ],
    },
    database: {
      title: 'The database', room: 'The pantry', short: 'Data',
      image: 'The pantry: ledgers where the app writes down everything it must remember, one line per item.',
      what: 'A database keeps information even when the app stops. It stores it in tables: one row per item, one column per piece of information.',
      here: ['The “{name}” table will hold one row per item, with these columns: {detail}.', 'The “{name}” table will hold one row per item.'],
      limit: 'Except a real database finds one row among millions in an instant, and many visitors write to it at once.',
      ask: { q: 'The app needs a piece of “{name}”. Where does it look?', a: ['In the “{name}” table', 'In the screen’s code', 'In the book of versions'], why: 'Lasting information lives in the database: the “{name}” table keeps it, one row per item.' },
      quiz: [
        { q: 'In a table of members, one row is…', a: ['One member and their details', 'One detail only, the email', 'One whole page of the app'], why: 'A row is a complete item, here a member. The columns are its details: email, name…' },
        { q: 'Why keep data in a database?', a: ['To find it again after a restart', 'To make the screen show faster', 'To write less interface code'], why: 'Without a database, everything is gone when the app stops. The database keeps it.' },
      ],
    },
    api: {
      title: 'The API', room: 'The pass', short: 'API',
      image: 'The pass between the dining room and the kitchen: the dining room hands in an order, the kitchen sends the dish back.',
      what: 'An API is the list of requests you can make to the server. Each request has an address, called a route, like /users.',
      here: ['The “{name}” route answers when the screen asks for this information.'],
      limit: 'Except everything here is strict: a malformed order is refused, and every answer carries a code (200 served, 404 not found).',
      ask: { q: 'The screen needs the “{name}” information. What does it do?', a: ['It calls the {name} route', 'It opens the .env file', 'It reruns all the tests'], why: 'The screen never reads the database itself: it orders from the API, which fetches and answers.' },
      quiz: [
        { q: 'The screen asks for the member list. What does the API do?', a: ['It fetches it and sends it back', 'It draws the list on screen', 'It saves a new version'], why: 'The API takes the order, fetches the data and sends the answer. The screen shows it.' },
        { q: 'In “GET /users”, what does GET mean?', a: ['We want to read data', 'We want to delete data', 'We want to draw a page'], why: 'GET asks to read. POST creates, DELETE removes.' },
      ],
    },
    auth: {
      title: 'Access', room: 'The front door', short: 'Access',
      image: 'The front door: someone checks who you are before letting you in, then where you may go.',
      what: 'Authentication checks who you are (signing in). Authorization then decides what you are allowed to do.',
      here: ['“{name}” does this check at your app’s door.'],
      limit: 'Except the app never keeps your password: only its fingerprint (a hash), which it compares.',
      ask: { q: 'A visitor types the wrong password. What stops them?', a: ['The “{name}” check', 'The member list', 'The book of versions'], why: '“{name}” compares what was typed with the stored fingerprint: if they differ, the door stays shut.' },
      quiz: [
        { q: 'Why is a password stored “hashed”?', a: ['So nobody can read it back', 'So it takes less space', 'So signing in is faster'], why: 'A hash cannot be read back: even if the database leaks, passwords stay unreadable.' },
        { q: 'Sign in, then open an admin-only page: in which order?', a: ['Authenticate, then authorize', 'Authorize, then authenticate', 'Test, then put it online'], why: 'First we check who you are, then what you may do.' },
      ],
    },
    tests: {
      title: 'Tests', room: 'The tasting', short: 'Tests',
      image: 'The tasting: before serving, every dish is tasted against the recipe. A test tastes one part of the app.',
      what: 'A test is a small program that checks one precise behaviour. They are rerun after every change to see what breaks.',
      here: ['Result in your project: {detail}.', 'Claude runs them to prove your app does what you asked.'],
      hereFail: 'A test failed: that is its job. It caught the mistake before your visitors did.',
      limit: 'Except a test checks only what it was asked to: all green does not mean zero bugs.',
      quiz: [
        { q: 'A test fails while Claude works. That is…', a: ['Useful: it flags a problem', 'Serious: the project is lost', 'Irrelevant: just ignore it'], why: 'A failing test did its job: it found a problem before visitors did.' },
        { q: 'Every test passes. That means…', a: ['What is checked works', 'The app has no bugs left', 'The app is already online'], why: 'A test checks only what it was asked to: what is not tested can still break.' },
      ],
    },
    git: {
      title: 'Versions', room: 'The recipe book', short: 'Versions',
      image: 'The recipe book: every time a recipe works, it is written down with the date. You can always go back to an old one.',
      what: 'Git keeps the project’s history. A commit is a named save of every file at one moment.',
      here: ['The commit “{name}” adds a page to your project’s recipe book.'],
      limit: 'Except the book stays on your computer until it is sent online (a push).',
      ask: { q: 'What does the commit “{name}” keep?', a: ['The project as it was then', 'Today’s list of visitors', 'The admin’s password'], why: 'A commit is a snapshot of every file: you can come back to that exact state.' },
      quiz: [
        { q: 'A commit is…', a: ['A named save of the project', 'A message sent to visitors', 'A test run automatically'], why: 'A commit records the project’s state with a message saying what changed.' },
        { q: 'A change breaks the app. Thanks to commits, you can…', a: ['Go back to the version before', 'Delete every member', 'Switch programming language'], why: 'Each commit is a point to return to: compare, go back, nothing is lost.' },
      ],
    },
    deps: {
      title: 'Dependencies', room: 'The suppliers', short: 'Tools',
      image: 'The suppliers: a restaurant does not raise its own hens, it buys ready-made ingredients. Here they are pieces of code.',
      what: 'A dependency is a library of code written by others, installed with a manager like npm. The list lives in package.json.',
      here: ['“{name}” arrives ready-made: Claude does not have to write it.'],
      limit: 'Except every supplier has its own suppliers: one broken part can stop everything.',
      ask: { q: 'Where does the code of “{name}” come from?', a: ['Other developers, shared online', 'Claude, who wrote it here', 'The app’s own database'], why: '“{name}” is a public library: npm downloaded it into your project.' },
      quiz: [
        { q: 'Why use a dependency?', a: ['To avoid rewriting what exists', 'To make the app run faster', 'To hide code from visitors'], why: 'You reuse tried code instead of rewriting everything.' },
        { q: 'Where is the list of a JavaScript project’s dependencies?', a: ['In the package.json file', 'In the members table', 'In the screen’s file'], why: 'package.json lists every dependency and its version: npm uses it to reinstall them.' },
      ],
    },
    config: {
      title: 'Settings', room: 'The safe', short: 'Settings',
      image: 'The office safe: keys and secret codes have no place on the menu. They are kept apart.',
      what: 'Environment variables (the .env file) keep settings and secrets out of the code, so they are never published.',
      here: ['“{name}” keeps these settings apart from the code.'],
      limit: 'Except a secret pushed to GitHub once stays in its history: it then has to be changed.',
      quiz: [
        { q: 'Why keep a secret key in .env?', a: ['So it is not published with code', 'So it shows on the screen', 'So the tests run faster'], why: 'Code gets shared, secrets do not: .env stays on the machine and out of Git.' },
        { q: 'The same code runs at home and online. What changes?', a: ['The environment’s settings', 'The source code’s language', 'Each component’s name'], why: 'The code is the same; only settings (database address, keys…) change from place to place.' },
      ],
    },
    deploy: {
      title: 'Going online', room: 'Opening night', short: 'Online',
      image: 'Opening to the public: until now the kitchen cooked in private. The sign lights up and anyone can come in.',
      what: 'Deploying means installing the app on an online server, so it answers at a public address.',
      here: ['“{name}” describes how your app goes online.'],
      limit: 'Except the live site is a copy of one precise version: your changes reach it only at the next deploy.',
      quiz: [
        { q: 'Before deploying, who can use the app?', a: ['Only you, on your computer', 'Anyone, at its address', 'Nobody: it does not exist'], why: 'While it runs on your computer, the app is a private kitchen.' },
        { q: 'What must stay out of the code before deploying?', a: ['Keys and passwords', 'Component names', 'Commit messages'], why: 'Secrets go into the server’s settings, never into published code.' },
      ],
    },
  },
}

export const lesson = (id, locale = 'en') => (LESSONS[locale] ?? LESSONS.en)[id] ?? null

const fillIn = (s, v) => String(s).replace(/\{(name|detail)\}/g, (_, k) => v[k] ?? '')
const fits = (s, v) => [...String(s).matchAll(/\{(name|detail)\}/g)].every(m => v[m[1]])

// What the notion is in the person's project: the first template whose fields are all known.
export function here(l, { name = '', detail = '', status = '' } = {}) {
  if (status === 'fail' && l.hereFail) return l.hereFail
  const v = { name, detail }
  const s = (l.here ?? []).find(t => fits(t, v))
  return s ? fillIn(s, v) : ''
}

// The questions of a notion: the one about the person's own project first, when it can be asked.
const questions = (l, name) => (l.ask && name ? [{ q: fillIn(l.ask.q, { name }), a: l.ask.a.map(a => fillIn(a, { name })), why: fillIn(l.ask.why, { name }) }, ...l.quiz] : l.quiz)

// The next question of a notion, its answers turned so the right one moves.
export function quiz(id, locale, n = 0, name = '') {
  const l = lesson(id, locale)
  if (!l) return null
  const list = questions(l, name)
  const item = list[n % list.length]
  const shift = (n + id.length) % item.a.length
  const answers = item.a.map((_, i) => item.a[(i + shift) % item.a.length])
  return { q: item.q, answers, right: answers.indexOf(item.a[0]), why: item.why, best: item.a[0] }
}

// Progress across sessions: XP, a streak of days, and per notion how often seen and answered right.
export const initialProgress = () => ({ xp: 0, streak: { last: '', days: 0 }, concepts: {} })
export const mastery = (progress, id) => Math.min(2, progress.concepts?.[id]?.correct ?? 0)
const day = ts => new Date(ts).toISOString().slice(0, 10)

export function seen(progress, id) {
  const c = progress.concepts?.[id] ?? { seen: 0, correct: 0 }
  return { ...progress, concepts: { ...progress.concepts, [id]: { ...c, seen: c.seen + 1 } } }
}

export function answered(progress, id, isRight, now) {
  const c = progress.concepts?.[id] ?? { seen: 1, correct: 0 }
  const today = day(now)
  // One missed day is forgiven: a broken streak makes people quit.
  const recent = [day(now - 86400000), day(now - 2 * 86400000)]
  const s = progress.streak ?? { last: '', days: 0 }
  const streak = s.last === today ? s : { last: today, days: recent.includes(s.last) ? s.days + 1 : 1 }
  return { xp: (progress.xp ?? 0) + (isRight ? 10 : 0), streak, concepts: { ...progress.concepts, [id]: { ...c, correct: c.correct + (isRight ? 1 : 0) } } }
}

// The streak as it stands now: a stored streak whose last answer is too old is over.
export function streakDays(progress, now) {
  const s = progress.streak ?? { last: '', days: 0 }
  return [day(now), day(now - 86400000), day(now - 2 * 86400000)].includes(s.last) ? s.days : 0
}

// The notion most worth a review: met but not mastered, least known first.
export function weakest(progress) {
  return CONCEPTS.filter(id => (progress.concepts?.[id]?.seen ?? 0) > 0 && mastery(progress, id) < 2)
    .sort((a, b) => mastery(progress, a) - mastery(progress, b))[0] ?? null
}

// Kitchen ranks, earned by notions mastered: understanding, not activity.
const RANKS = {
  fr: [[0, 'Apprenti'], [1, 'Commis'], [3, 'Cuisinier'], [5, 'Chef de partie'], [7, 'Sous-chef'], [9, 'Chef']],
  en: [[0, 'Apprentice'], [1, 'Commis'], [3, 'Cook'], [5, 'Chef de partie'], [7, 'Sous-chef'], [9, 'Head chef']],
}
export function rank(progress, locale = 'en') {
  const done = CONCEPTS.filter(id => mastery(progress, id) >= 2).length
  const list = RANKS[locale] ?? RANKS.en
  let i = 0
  while (i + 1 < list.length && done >= list[i + 1][0]) i++
  const [from, title] = list[i]
  const next = list[i + 1]
  return { title, done, next: next?.[1] ?? '', need: next ? next[0] - done : 0, ratio: next ? (done - from) / (next[0] - from) : 1 }
}
