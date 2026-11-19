// Greek text of the two pages (index.html and about.html). Each pair is [English piece as it
// stands in the page, Greek text]. vite.config.ts swaps them when the site is built with
// VITE_LANG=el (spaces and line breaks do not matter). If a piece is no longer in the page,
// the build stops and names it, so the English page and this file cannot drift apart.
// Words follow docs/GLOSSARY-el.md. NOT yet checked by a native speaker.
type Pairs = [en: string, el: string][];

const both: Pairs = [
  ["Conditions only. Never eat a wild mushroom based on this map, an app or an AI.",
    "Μόνο συνθήκες. Ποτέ μην φάτε άγριο μανιτάρι με βάση αυτόν τον χάρτη, μια εφαρμογή ή το AI."],
  ['aria-label="Poisoning emergency: 112 and 1401"', 'aria-label="Έκτακτη ανάγκη δηλητηρίασης: 112 και 1401"'],
];

const index: Pairs = [
  [`content="Today's growing conditions for wild mushrooms in Cyprus forests. Conditions only. Never eat a wild mushroom based on this map, an app or an AI."`,
    'content="Οι σημερινές συνθήκες ανάπτυξης για τα άγρια μανιτάρια στα δάση της Κύπρου. Μόνο συνθήκες. Ποτέ μην φάτε άγριο μανιτάρι με βάση αυτόν τον χάρτη, μια εφαρμογή ή το AI."'],
  [`content="Today's growing conditions for wild mushrooms in Cyprus forests. Conditions only."`,
    'content="Οι σημερινές συνθήκες ανάπτυξης για τα άγρια μανιτάρια στα δάση της Κύπρου. Μόνο συνθήκες."'],
  ["<title>Shroomy · mushroom growing conditions in Cyprus</title>", "<title>Shroomy · συνθήκες ανάπτυξης μανιταριών στην Κύπρο</title>"],
  ['aria-label="Shroomy, home" data-tip="Reload the map."', 'aria-label="Shroomy, αρχική" data-tip="Φόρτωση του χάρτη ξανά."'],
  ['<span class="brand-sub">Conditions today</span>', '<span class="brand-sub">Συνθήκες σήμερα</span>'],
  ['data-tip="What this map shows, where the data comes from, and its limits.">About</a>',
    'data-tip="Τι δείχνει αυτός ο χάρτης, από πού προέρχονται τα δεδομένα και ποια είναι τα όριά του.">Σχετικά</a>'],
  ['data-tip="Mushroom poisoning help: call 112 (ambulance) or the Cyprus Poison Centre 1401. Do not wait for symptoms."',
    'data-tip="Βοήθεια για δηλητηρίαση από μανιτάρια: καλέστε το 112 (ασθενοφόρο) ή το Κέντρο Δηλητηριάσεων Κύπρου 1401. Μην περιμένετε συμπτώματα."'],
  [`aria-label="Map of today's growing conditions in Cyprus"`, 'aria-label="Χάρτης των σημερινών συνθηκών ανάπτυξης στην Κύπρο"'],
  ["Loading the forest map…", "Φορτώνει ο χάρτης του δάσους…"],
  ['aria-label="Today and the tapped square"', 'aria-label="Σήμερα και το τετράγωνο που πατήσατε"'],
];

const about: Pairs = [
  ["<title>About · Shroomy</title>", "<title>Σχετικά · Shroomy</title>"],
  ["← Back to the map", "← Πίσω στον χάρτη"],
  ["<h1>About this map</h1>", "<h1>Σχετικά με αυτόν τον χάρτη</h1>"],
  ["<strong>Beta.</strong> Shroomy is a work in progress. Things may change, and some numbers are still being checked.",
    "<strong>Beta.</strong> Το Shroomy είναι έργο σε εξέλιξη. Κάποια πράγματα μπορεί να αλλάξουν, και ορισμένοι αριθμοί ελέγχονται ακόμη."],

  ["<h2>What it shows</h2>", "<h2>Τι δείχνει</h2>"],
  [`The map shows <b>growing conditions</b> in the forests of Cyprus, <b>today</b>.
      It colours each forest square of 250 m from poor to very good.`,
    "Ο χάρτης δείχνει τις <b>συνθήκες ανάπτυξης</b> στα δάση της Κύπρου, <b>σήμερα</b>. Χρωματίζει κάθε δασικό τετράγωνο 250 m ανάλογα με τις συνθήκες, από κακές έως πολύ καλές."],
  [`It <b>never</b> shows where mushrooms are. It never tells you what a mushroom is.
      It never says a mushroom can be eaten.`,
    "<b>Ποτέ</b> δεν δείχνει πού υπάρχουν μανιτάρια. Ποτέ δεν σας λέει ποιο είδος είναι ένα μανιτάρι. Ποτέ δεν λέει ότι ένα μανιτάρι μπορεί να φαγωθεί."],
  [`Double tap to zoom in. Close up, the forest shows <b>shade in 50 m squares</b>: cool slopes,
      valley bottoms and little autumn sun. Tap a square to see its growing conditions.`,
    "Πατήστε δύο φορές για μεγέθυνση. Σε μεγέθυνση, το δάσος δείχνει τη <b>σκιά σε τετράγωνα 50 m</b>: δροσερές πλαγιές, πυθμένες κοιλάδων και λίγος φθινοπωρινός ήλιος. Πατήστε ένα τετράγωνο για να δείτε τις συνθήκες ανάπτυξής του."],
  ["Nature reserves are <b>closed</b> to picking. They are grey with lines and always score 0.",
    "Τα φυσικά αποθέματα είναι <b>κλειστά</b> για συλλογή. Είναι γκρι με γραμμές και έχουν πάντα βαθμολογία 0."],

  ["<h2>What goes into the score</h2>", "<h2>Τι μετρά στη βαθμολογία</h2>"],
  ["<p>Three things matter most.</p>", "<p>Τρία πράγματα μετρούν περισσότερο.</p>"],
  ["<b>Trees.</b> Our mushrooms grow with partner trees: pine and golden oak. No partner tree, no score.",
    "<b>Δέντρα.</b> Τα μανιτάρια μας συμβιώνουν με δέντρα: πεύκα και λατζιά. Χωρίς αυτά τα δέντρα, καμία βαθμολογία."],
  ["<b>Recent rain.</b> The ground needs a good soaking. A big rain 1 to 3 weeks ago helps most.",
    "<b>Πρόσφατη βροχή.</b> Το έδαφος πρέπει να ποτιστεί καλά. Μια ισχυρή βροχή πριν από 1 έως 3 εβδομάδες βοηθά περισσότερο."],
  ["<b>Temperature.</b> Mild days are best. Too hot or too cold, and the score drops.",
    "<b>Θερμοκρασία.</b> Οι ήπιες μέρες είναι οι καλύτερες. Με πολλή ζέστη ή πολύ κρύο, η βαθμολογία πέφτει."],
  [`Wet soil, the right month for the height, and shade add a little more.
      Tap the rating word on a square to see every part.`,
    "Το υγρό έδαφος, ο σωστός μήνας για το υψόμετρο και η σκιά προσθέτουν λίγο ακόμη. Πατήστε τη λέξη της βαθμολογίας σε ένα τετράγωνο για να δείτε κάθε μέρος."],
  [`The <b>mushroom clock</b> counts the days since the last soaking rain.
      It tells you if the fruiting window is open.`,
    "Το <b>ρολόι των μανιταριών</b> μετρά τις μέρες από την τελευταία ισχυρή βροχή. Σας λέει αν η περίοδος καρποφορίας είναι ανοιχτή."],

  ["<h2>Where the data comes from</h2>", "<h2>Από πού προέρχονται τα δεδομένα</h2>"],
  ["<b>Weather:</b> Open-Meteo, a free weather service.", "<b>Καιρός:</b> Open-Meteo, μια δωρεάν υπηρεσία καιρού."],
  ["<b>Trees:</b> the Copernicus forest map of Europe, from 2018.", "<b>Δέντρα:</b> ο δασικός χάρτης της Ευρώπης του Copernicus, του 2018."],
  ["<b>Heights and slopes:</b> the Copernicus height map of Europe.", "<b>Υψόμετρα και πλαγιές:</b> ο υψομετρικός χάρτης της Ευρώπης του Copernicus."],
  ["<b>Golden oak zone:</b> the rock map of the Geological Survey Department of Cyprus.",
    "<b>Ζώνη της λατζιάς:</b> ο γεωλογικός χάρτης του Τμήματος Γεωλογικής Επισκόπησης της Κύπρου."],
  ["<b>Burned forest:</b> EFFIS satellite fire maps, since 2018.", "<b>Καμένο δάσος:</b> δορυφορικοί χάρτες πυρκαγιών EFFIS, από το 2018."],
  ["<b>Nature reserves:</b> the European list of protected areas (EEA).", "<b>Φυσικά αποθέματα:</b> ο ευρωπαϊκός κατάλογος προστατευόμενων περιοχών (EEA)."],
  ["<b>Roads, tracks and the base map:</b> OpenStreetMap.", "<b>Δρόμοι, δασικοί δρόμοι και ο χάρτης υποβάθρου:</b> OpenStreetMap."],
  ["<b>Mushroom photos:</b> iNaturalist. Each photo shows its author and licence.",
    "<b>Φωτογραφίες μανιταριών:</b> iNaturalist. Κάθε φωτογραφία δείχνει τον δημιουργό και την άδειά της."],
  ["<b>Public records on the mushroom cards:</b> GBIF and iNaturalist (counts and links only).",
    "<b>Δημόσιες καταγραφές στις κάρτες μανιταριών:</b> GBIF και iNaturalist (μόνο αριθμοί και σύνδεσμοι)."],
  ["Weather update used:", "Ενημέρωση καιρού που χρησιμοποιήθηκε:"],

  ["<h2>The honest limits</h2>", "<h2>Τα όρια, με ειλικρίνεια</h2>"],
  [`<b>The weather is coarse.</b> Each weather square is about 9 km wide.
        Rain in the mountains can be very different a few kilometres away.`,
    "<b>Ο καιρός δεν είναι λεπτομερής.</b> Κάθε τετράγωνο καιρού έχει πλάτος περίπου 9 km. Η βροχή στα βουνά μπορεί να είναι πολύ διαφορετική λίγα χιλιόμετρα πιο πέρα."],
  ["<b>The trees are from a 2018 map.</b> Forests change. Some trees may be gone, or new.",
    "<b>Τα δέντρα είναι από χάρτη του 2018.</b> Τα δάση αλλάζουν. Κάποια δέντρα μπορεί να μην υπάρχουν πια, ή να είναι νέα."],
  ["<b>A good square can still be empty.</b> Good conditions do not mean mushrooms are there.",
    "<b>Ένα καλό τετράγωνο μπορεί να είναι άδειο.</b> Οι καλές συνθήκες δεν σημαίνουν ότι υπάρχουν μανιτάρια εκεί."],
  ["Use the map to choose <b>where and when to look</b>. Never to decide <b>what to pick</b>.",
    "Χρησιμοποιήστε τον χάρτη για να διαλέξετε <b>πού και πότε να ψάξετε</b>. Ποτέ για να αποφασίσετε <b>τι θα μαζέψετε</b>."],

  ["<h2>The law in the forest</h2>", "<h2>Ο νόμος στο δάσος</h2>"],
  ["Picking is allowed in state forests without a permit, <b>but not in nature reserves</b>.",
    "Η συλλογή μανιταριών από τα Κρατικά Δάση επιτρέπεται χωρίς άδεια, <b>όχι όμως στα φυσικά αποθέματα</b>."],
  ["<b>Rakes and tools are banned:</b> up to 1 year in prison, up to €5,000 fine, or both.",
    "<b>Οι τσουγκράνες και άλλα εργαλεία που σκαλίζουν το έδαφος απαγορεύονται:</b> φυλάκιση μέχρι ένα έτος ή χρηματική ποινή μέχρι €5.000 ή και οι δύο ποινές."],
  ["<b>No fires</b> in forests or within 2 km of them.", "<b>Όχι φωτιές</b> μέσα στα δάση ή σε απόσταση 2 km από αυτά."],
  ["<p>Pick by hand or knife. Put the leaf litter back.</p>",
    "<p>Συλλέγουμε με το χέρι ή με μαχαίρι. Βάζουμε τη φυλλάδα (τα πεσμένα φύλλα και τις πευκοβελόνες) πίσω στη θέση της.</p>"],

  ["<h2>Poisoning</h2>", "<h2>Δηλητηρίαση</h2>"],
  [`Call <a href="tel:112"><b>112</b></a> (ambulance) or the Cyprus Poison Centre <a href="tel:1401"><b>1401</b></a>.
      <b>Do not wait for symptoms.</b> Bring the mushroom to the hospital.`,
    'Καλέστε το <a href="tel:112"><b>112</b></a> (ασθενοφόρο) ή το Κέντρο Δηλητηριάσεων Κύπρου <a href="tel:1401"><b>1401</b></a>. <b>Μην περιμένετε συμπτώματα.</b> Πάρτε μαζί σας το μανιτάρι στο νοσοκομείο.'],

  ["<h2>Counting visits</h2>", "<h2>Μέτρηση επισκέψεων</h2>"],
  ["Shroomy counts visits, so we can see which parts people use. It is a beta, and this helps us fix it.",
    "Το Shroomy μετρά τις επισκέψεις, για να βλέπουμε ποια κομμάτια του χρησιμοποιούνται. Είναι beta, και αυτό μας βοηθά να το διορθώνουμε."],
  ["<b>No cookies.</b> Nothing is stored on your phone.", "<b>Χωρίς cookies.</b> Τίποτα δεν αποθηκεύεται στο τηλέφωνό σας."],
  ["<b>Never the place you look at.</b> Not the square you tap, not your location.",
    "<b>Ποτέ το μέρος που κοιτάζετε.</b> Ούτε το τετράγωνο που πατάτε, ούτε η θέση σας."],
  ["<b>What is counted:</b> the page, the button you tap, your screen size, and the website you came from.",
    "<b>Τι μετριέται:</b> η σελίδα, το κουμπί που πατάτε, το μέγεθος της οθόνης σας και η ιστοσελίδα από την οποία ήρθατε."],
  ["<b>Do Not Track is respected.</b> If your browser asks not to be counted, nothing is sent.",
    "<b>Το «Do Not Track» γίνεται σεβαστό.</b> Αν το πρόγραμμα περιήγησής σας ζητά να μη μετριέστε, δεν στέλνεται τίποτα."],
  [`The counter is <a href="https://www.goatcounter.com" target="_blank" rel="noopener">GoatCounter</a>. It does not keep your IP address.`,
    'Ο μετρητής είναι το <a href="https://www.goatcounter.com" target="_blank" rel="noopener">GoatCounter</a>. Δεν κρατά τη διεύθυνση IP σας.'],

  ["<h2>Full credits and licences</h2>", "<h2>Όλες οι πηγές και οι άδειες</h2>"],
  ["<summary>Show the exact credit for each source</summary>", "<summary>Δείτε την ακριβή αναφορά για κάθε πηγή</summary>"],
  ['<div id="credits"><p>Loading…</p></div>', '<div id="credits"><p>Φορτώνει…</p></div>'],
  ["<summary>Show every mushroom photo credit</summary>", "<summary>Δείτε τα στοιχεία κάθε φωτογραφίας μανιταριού</summary>"],
  ["We only use photos with a CC0, CC BY, CC BY-SA or CC BY-NC licence.", "Χρησιμοποιούμε μόνο φωτογραφίες με άδεια CC0, CC BY, CC BY-SA ή CC BY-NC."],
  ['<ul id="photo-credits" class="credits"><li>Loading…</li></ul>', '<ul id="photo-credits" class="credits"><li>Φορτώνει…</li></ul>'],
];

export const HTML_EL = { both, index, about };
