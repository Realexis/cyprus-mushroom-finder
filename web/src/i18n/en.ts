// English text of the site. This file is the master copy: el.ts must have the same keys
// (TypeScript checks it). The page text of index.html and about.html stays in those files;
// its Greek version is in html.el.ts.
// Nothing here ever says a mushroom can be eaten.

const MONTH_LONG = ["January", "February", "March", "April", "May", "June", "July", "August",
  "September", "October", "November", "December"];
const s = (n: number) => (n === 1 ? "" : "s");
const AMANITA_SIGNS = "a skirt-like ring on the stem, white gills, and a cup (sac) at the base. The cup can be hidden in the soil: clear the soil to check. These are signs of deadly Amanitas.";
const cap1 = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const NOT_CHECKED = "From public sources, <b>not checked by an expert</b>. Never use it to decide what to eat.";

export interface FieldNotes {
  look: [string, string][];   // [part, what to look for]
  where: string[];
  danger: string[];           // "leave it alone if…" signs
  check: string[];            // things still to confirm (behind the info button)
}
/** Text that comes from the pipeline inside species.json. English uses the file's own text (null). */
export interface SpeciesText { /** The name shown big, when it is not the Latin name (Greek build). */ title?: string; common: string; local: string; trees_text: string; altitude_text: string; season_text: string; notes: string[]; }

export const en = {
  locale: "en-GB",
  monthLetter: ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"],
  monthShort: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  monthLong: MONTH_LONG,
  /** "in November" */
  inMonth: (m: number) => `in ${MONTH_LONG[m - 1]}`,
  /** A number with a fixed count of decimals. */
  num: (v: number, digits = 1) => v.toFixed(digits),

  /** The button that opens the other language (written in THAT language, so its readers find it). */
  lang: { otherCode: "el", otherName: "Ελληνικά", otherShort: "ΕΛ", otherLabel: "Ελληνικά: η σελίδα στα ελληνικά",
    otherTip: "Ελληνικά: ανοίγει τη σελίδα στα ελληνικά. Η προειδοποίηση εμφανίζεται ξανά." },

  safety: {
    line: "Conditions only. Never eat a wild mushroom based on this map, an app or an AI.",
    numbers: `Poisoning: call <a href="tel:112">112</a> · Poison Centre <a href="tel:1401">1401</a>`,
    emTitle: "Mushroom poisoning?",
    emSub: "Act now. Do not wait for symptoms.",
    call112: "Call 112", ambulance: "Ambulance",
    call1401: "Cyprus Poison Centre: 1401",
    emList: [
      "<b>Do not wait for symptoms.</b> Death cap poisons show no symptoms for <b>6–12 hours</b>. Some Cyprus species act after about <b>48 hours</b>.",
      "<b>Bring the mushroom</b> (or what is left of it) to the hospital.",
      "<b>Cooking does not remove the poison.</b>",
    ],
    close: "Close",
    fullTitle: "This is not a game",
    fullSub: "Some wild mushrooms in Cyprus can kill. They can look just like others.",
    fullList: [
      "<b>Never eat a mushroom based on pictures or guesses.</b> Not from this site, an app or an AI.",
      "<b>Always have an experienced person check it,</b> in person. Trust them before any screen.",
      "<b>Learn first. Do not just go and guess.</b> Go out with people who know mushrooms.",
      "<b>Good conditions grow deadly mushrooms too.</b> A high score says nothing about what a mushroom is. This site is not enough to decide.",
    ],
    agree: "I understand and agree",
    hobby: "ShroomyMap is a hobby project in beta. It can be wrong.",
    shortTitle: "Not a game",
    shortLine: "<b>Never eat a mushroom based on pictures or guesses.</b> Always have an experienced person check it.",
    shortOk: "OK, I agree",
    readFull: "Read the full warning",
  },

  main: {
    betaTip: "Beta: a work in progress. Things may change or be wrong.",
    delayed: (run: string) => `Data delayed · last update ${run}`,
    delayedTip: "Today's weather update has not arrived yet. The map shows today from the last good update. It usually updates each morning at about 6:30 am Cyprus time.",
    geoTip: "Show where you are on the map (needs location permission). Your position stays on your phone.",
    slow: "Still loading… a slow connection can take a minute.",
    failed: "The map could not load. Check your internet connection, then reload the page.",
    notScored: "Not scored here.",
    hover: (word: string, score: number | string) => `${word} · ${score}/100. Click for details.`,
    closedLabel: "CLOSED",
    /** Nature reserve names on the map, keyed by the name in reserves.geojson. English: as in the file. */
    reserveNames: {} as Record<string, string>,
    /** Language of the place names on the base map (a language code the map tiles carry). */
    mapLang: "en",
  },

  card: {
    trees: { 1: "Calabrian pine (likely)", 2: "Troodos black pine (likely)", 3: "Golden oak (likely)",
      4: "Other broadleaf", 5: "Tripylos cedar zone (closed)",
      6: "Burned forest (recent fire)", 7: "Burned forest (fire since 2018)" } as Record<number, string>,
    forest: "Forest",
    bands: { 1: "low", 2: "mid", 3: "high (above 1,200 m)" } as Record<number, string>,
    band: (b: string) => `${b} band`,
    factorLabel: {
      rain_total: "Rain, last 30 days", rain_pulse: "Soaking rain 7–20 days ago",
      temperature: "Temperature, last 7 days", soil_moisture: "Soil moisture",
      season_altitude: "Season for the altitude", shade: "Shade",
    } as Record<string, string>,
    factorTip: {
      rain_total: "All rain in the last 30 days. No points below 20 mm, full points from 80 mm.",
      rain_pulse: "The biggest 3-day rain between 7 and 20 days ago. No points below 10 mm, full points from 25 mm.",
      temperature: "Average temperature of the last 7 days, corrected for height. Best 8-18 °C. No points at 3 °C or 24 °C. Frost days take points off.",
      soil_moisture: "How wet the top soil is now, compared with the same place in the autumns and winters of 2024-25 and 2025-26. Wetter than most days = more points.",
      season_altitude: "Is it the right month for this height? High Troodos starts in September, middle heights in October, low hills in November. The season runs to April.",
      shade: "North and east-facing slopes, valley bottoms and little autumn sun keep the ground moist longer.",
    } as Record<string, string>,
    rakesTip: "Cyprus law: rakes and tools are banned in the forest (up to 1 year in prison, up to €5,000 fine, or both). No fires in or within 2 km of forests.",
    noRakes: "<b>No rakes.</b> Pick by hand or knife. Put the leaf litter back.",
    words: { veryGood: "Very good", good: "Good", fair: "Fair", poor: "Poor" },
    clockNone: (mm: number) => `No soaking rain (${mm} mm+) yet this season. Fruiting window closed.`,
    clockWait: (since: number, k: number) => `Soaking rain ${since} days ago. Window opens in ${k} day${s(k)}.`,
    clockOpen: (since: number, k: number) => `Soaking rain ${since} days ago. Window OPEN, about ${k} more day${s(k)}.`,
    clockClosed: (since: number) => `Last soaking rain was ${since} days ago. Fruiting window has closed.`,
    clockTip: (mm: number, opens: number, closes: number) =>
      `Counts the days since the last soaking rain (${mm} mm or more). The fruiting window opens about ${opens} days after it and closes about ${closes} days after it.`,
    clockTipLater: (mm: number, opens: number, later: number, closes: number) =>
      `Counts the days since the last soaking rain (${mm} mm or more). The season's first window opens about ${opens} days after the first soaking rain. After that, each new soaking rain opens it again after about ${later} days. It closes about ${closes} days after the latest one.`,
    clockLabel: "Mushroom clock:",
    countedFrom: (day: string) => `(rain counted from ${day})`,
    in3days: (mm: string) => `${mm} mm in 3 days`,
    tempAvg: (t: string) => `${t} °C average`,
    frost: (n: number) => ` · frost on ${n} day${n >= 2 ? "s" : ""}`,
    soilPct: (p: number) => `wetter than ${p}% of days in recent seasons`,
    gateAgo: (age: number) => (age > 0 ? `, ${age} day${s(age)} ago` : age === 0 ? ", today" : ""),
    gateWord: { yes: "yes", no: "no", partly: "partly" },
    gateFull: (mm: string, ago: string) => `${mm} mm in 3 days${ago}. No cut.`,
    gateNone: (pct: number) => `No rain worth counting in the last month, so the score is cut to ${pct}%.`,
    gateOld: (mm: string, ago: string, pct: number) => `${mm} mm in 3 days${ago}. Older rain counts less each day, so the score is cut to ${pct}%.`,
    gateShort: (mm: string, ago: string, need: number, pct: number) => `${mm} mm in 3 days${ago} (${need} mm needed), so the score is cut to ${pct}%.`,
    gateTip: (days: number, mm: number) => `Mushrooms need a soaking rain. The score is multiplied by the biggest 3-day rain of the last ${days} days, divided by ${mm} mm. ${mm} mm or more = no cut. Rain older than 20 days counts a little less each day, and not at all after ${days} days.`,
    gateLabel: (word: string) => `Soaking rain in the last month: <b>${word}</b>`,
    loadingParts: "Loading the score parts…",
    noParts: "No score parts are stored for this square.",
    countsTip: (w: number) => `This counts for ${w}% of the score.`,
    counts: (w: number) => `counts ${w}%`,
    barLabel: (label: string, pct: number) => `${label}: ${pct} out of 100`,
    fineTip: "Close up, each 50 m patch starts from its 250 m square's score. Shadier than the square = higher, sunnier = lower. The size of that step is an educated guess, not a measured rule. Rain, temperature and soil are the same for the whole area.",
    fineNote: (patch: number, square: number, sh: number, sq: number) => `This 50 m patch: <b>${patch}</b>. Its 250 m square: <b>${square}</b>.
        Shade here ${sh}/100, the square ${sq}/100. The shade step is an educated guess.`,
    fineFail: "This is the number of the whole 250 m square. The patch's own number could not be worked out.",
    notScored: "Not scored",
    working: "Working out this patch…",
    ratingTip: "How good the growing conditions are in this square today. Tap to see why.",
    ratingSub: (v: number) => `growing conditions today · ${v}/100`,
    why: "Why this score: six things count. A long bar = that thing is good right now.",
    whyWhole: " These bars are for the whole 250 m square.",
    inSeasonHere: (m: number) => `In season here in ${MONTH_LONG[m - 1]}`,
    openCardTip: "Open the mushroom card: photos, what to look for, where, when, and its deadly lookalikes.",
    fitNote: "Their trees, altitude and month fit this square. It does not mean they are here.",
    noneInSeason: (m: number) => `None of our target mushrooms is in season for these trees and this altitude in ${MONTH_LONG[m - 1]}.`,
    road: (track: string, road: string) => `forest track ${track} · road ${road}`,
    loading: "loading…",
    treesTip: "The likely trees, worked out from satellite forest maps, height and rock type. Not a tree survey.",
    treesLabel: "Trees:",
    altTip: "Height above sea level. Higher forest is cooler and its season starts earlier.",
    altLabel: "Altitude:",
    nearTip: "Straight-line distance to the nearest forest track and drivable road, from OpenStreetMap. Not a driving route.",
    nearLabel: "Nearest:",
    shadeTip: (fa: number, va: number, ls: number) => `The 50 m square you tapped: the average of three terrain parts. Faces north-east (cooler) ${fa}/100, valley bottom ${va}/100, little autumn sun ${ls}/100. Shade keeps the ground moist. Terrain only: the weather is the same for the whole area.`,
    shadeLabel: "Shade here (50 m):",
    driveTip: "Opens Google Maps with driving directions to the middle of this 250 m square. Free, no sign-in. Forest tracks may be rough.",
    drive: "Drive there",
    rough: "tracks may be rough",
    shareText: "250 m forest square (ShroomyMap: growing conditions only)",
    shareTip: "Send a Google Maps pin of the middle of this 250 m square to a friend. On a computer it copies the link.",
    share: "Share location",
    mapsNote: "Both use the middle of this 250 m square. It may be away from roads and tracks.",
    noDirections: "No directions for this square: it is in or next to a nature reserve.",
    whatPatch: "50 m patch · today",
    whatSpot: "50 m spot · conditions of its 250 m square",
    whatSquare: "250 m forest square · today",
    closeCard: "Close this card", closeCardTip: "Close this card.",
    failed: "Some details could not load. Check your connection and tap the square again.",
    shareTitle: "Location",
    copied: "Link copied ✓",
    copyBelow: "Copy the link below",
    mapsLink: "Google Maps link",
  },

  panel: {
    layers: {
      rain: { label: "Rain", tip: "Rain on each day.", avg: (v: number) => `${v.toFixed(1)} mm` },
      temp: { label: "Temperature", tip: "Average air temperature on each day.", avg: (v: number) => `${v.toFixed(1)} °C` },
      soil: { label: "Soil", tip: "How wet the top 7 cm of soil is on each day.", avg: (v: number) => `${Math.round(v)}% water` },
    },
    pause: "❚❚ Pause", play: "▶ Play",
    pauseLabel: "Pause the rain replay", playLabel: "Play the rain replay",
    today: "· today",
    daysAgo: (n: number) => `· ${n} day${s(n)} ago`,
    islandAvg: (v: string) => `Island average ${v}`,
    backTip: "Back to today's growing conditions.",
    back: "Back to today's map",
    replayFailed: "The replay could not load. Check your connection and try again.",
    replayLoading: "Loading the replay…",
    segLabel: "What the replay shows",
    replayTitle: "Replay: the last 30 days",
    scrubLabel: "Day of the rain replay",
    scrubTip: "Each bar is one day. Taller bar = more that day, over the whole island. Drag anywhere here to move through the days.",
    endAgo: (n: number) => `${n} days ago`, drag: "Drag to move", endToday: "Today",
    replayNote: "Daily values for each ~3 km weather square, from the weather model.",
    todayB: "Today",
    replayBtn: "Weather replay",
    replayBtnTip: "Watch the last 30 days move over the island, day by day: rain, temperature and soil wetness.",
    cardsBtn: "Mushroom cards",
    cardsBtnTip: "Photos, season, trees and the deadly lookalikes for each mushroom.",
    hint: "<b>Double tap</b> the map to zoom in. <b>Tap a square</b> to see its conditions.",
  },

  legend: {
    rain: { title: "Rain that day", left: "0.5 mm", right: "30+ mm",
      tip: "Rain on the day shown in the replay. Pale = a little, dark blue = a lot." },
    temp: { title: "Temperature that day", left: "0 °C", right: "30 °C",
      tip: "Average air temperature on the day shown in the replay. Blue = cold, pale = mild, red = warm." },
    soil: { title: "Soil wetness that day", left: "Dry", right: "Wet",
      tip: "How much water the top 7 cm of soil holds on the day shown, from the weather model. Sand = dry, dark blue = wet. Soils differ, so compare a place with itself over time." },
    shade: { title: "Shade (50 m)", left: "Sunny", right: "Deep shade",
      tip: "Close up, the forest shows shade in 50 m squares: cool north-east slopes, valley bottoms and little autumn sun. Shade keeps the ground moist. Terrain only, no finer weather. Tap a square for its growing conditions. Zoom out to see the colours of the conditions." },
    fine: { title: "Growing conditions today", left: "Poor", right: "Very good",
      tip: "Close up, each 50 m patch has its own colour and number: its 250 m square's conditions today, moved up where the patch is shadier than its square and down where it is sunnier. The size of that step is an educated guess. Rain, temperature and soil are the same for the whole area. Not a sign that mushrooms are there. Hatched grey = nature reserve, closed to picking." },
    cond: { title: "Growing conditions today", left: "Poor", right: "Very good",
      tip: "Colour of each 250 m forest square: how good the growing conditions are today, from poor (dark green) to very good (orange-red). Not a sign that mushrooms are there. Hatched grey = nature reserve, closed to picking." },
    zoomOut: "Zoom out to see the conditions",
    fineNote: "50 m patches · shade counted in",
    reserve: "Reserve: <b>closed</b>",
    aria: (title: string, left: string, right: string, shade: boolean, replay: boolean) =>
      `Colour key: ${title}, from ${left} to ${right}.${shade ? " Zoom out to see the conditions." : ""}${replay ? "" : " Hatched grey: nature reserve, closed."}`,
  },

  fullmap: {
    exit: "Exit full map", exitLabel: "Exit full map (Esc)",
    full: "Full map", fullLabel: "Full map: the whole island, nothing else",
    tip: "Show the whole island on the full screen, flat and north up, without the panels. "
      + "Good for screenshots. Press Esc or \"Exit full map\" to come back.",
  },

  about: {
    beingChecked: " · licence being checked",
    protomapsName: "Protomaps basemap",
    protomapsCredit: "Map tiles from the Protomaps build of OpenStreetMap. © OpenStreetMap contributors (ODbL).",
    /** Notes on how a source is used, keyed by the English text in meta.json. English: as in the file. */
    use: {} as Record<string, string>,
    /** Credit lines that are plain sentences (not a legal credit), keyed by the English text. */
    credit: {} as Record<string, string>,
    /** Licence notes that are plain sentences (not licence names), keyed by the English text. */
    licence: {} as Record<string, string>,
  },

  species: {
    /** Text from species.json, by species code. English: the file's own text. */
    text: null as Record<string, SpeciesText> | null,
    /** Lookalikes from species.json, by Latin name. English: the file's own text. */
    lookText: null as Record<string, { common: string; note: string }> | null,
    /** Link labels from species.json: "GBIF records in Cyprus: X" and so on. */
    linkLabel: (label: string) => label,
    sourceLabel: {
      forests: "Cyprus Department of Forests: Funga / Mushrooms",
      leaflet: "Cyprus Department of Forests leaflet: Mushrooms in Cyprus (English version; the local names are in the Greek version)",
      kykpee: "KYKPEE: Μανιτάρια της Κύπρου (2015)",
      pedoulas: "Pedoulas: Οδηγός για τα μανιτάρια της Κύπρου",
      dialogos: "Dialogos: Μανιτάρια, ένας θησαυρός της κυπριακής φύσης (2017)",
      w_lde: "Wikipedia: Lactarius deliciosus",
      w_lsa: "Wikipedia: Lactarius sanguifluus",
      w_rde: "Wikipedia: Russula delica",
      w_tca: "Wikipedia: Tricholoma caligatum",
      w_slu: "Wikipedia: Suillus (slippery Jacks)",
      w_arb: "Wikipedia: Morchella arbutiphila (described from Cyprus)",
      w_dis: "Wikipedia: Morchella disparilis (described from Cyprus)",
      w_false: "Wikipedia: False morel",
      w_dcap: "Wikipedia: Death cap (Amanita phalloides)",
      fn_lde: "First Nature: Lactarius deliciosus",
      fn_tor: "First Nature: Lactarius torminosus",
      fn_chr: "First Nature: Lactarius chrysorrheus",
      fn_col: "First Nature: Suillus collinitus",
      w_sgr: "Wikipedia: Suillus granulatus",
      w_slt: "Wikipedia: Suillus luteus",
      exub: "Miller lab (2017): first report of Morchella exuberans in eastern North America, citing Loizides et al. 2016 for burned Calabrian pine in Cyprus",
      ncbi: "NCBI StatPearls: Gyromitra toxicity",
      agrotis: "Agrotis magazine 481 (2021), E. Hadjisterkotis, Agricultural Research Institute: telling Cyprus mushrooms from their poisonous lookalikes, part 2 (Greek, PDF)",
    } as Record<string, string>,
    amanitaSigns: AMANITA_SIGNS,
    field: {
      lde: {
        look: [
          ["Cap", "Carrot-orange, often with darker orange rings. The edge is rolled in when young; funnel-shaped when old."],
          ["Gills", "Orange and crowded, running a little down the stem."],
          ["Stem", "Short, orange and hollow, often with small darker orange pits."],
          ["Milk", "Cut it: orange, carrot-coloured milk comes out."],
          ["Bruises", "Gills and flesh turn green where touched or bruised."],
        ],
        where: [
          "Mainly under pines: Calabrian pine and Troodos black pine.",
          "Also with golden oak, kermes oak, strawberry tree, mastic and terebinth.",
          "Under pine needles and fallen golden-oak leaves.",
          "Damp, sheltered slopes and valleys, rather than windy, sunny ones.",
        ],
        danger: [
          "White milk, or milk that turns yellow. The yellowdrop milk cap's milk turns sulphur yellow in seconds.",
          "A pinker cap with a woolly, shaggy edge: the woolly milk cap (mallitsis). It is poisonous and grows in Cyprus.",
        ],
        check: ["The woolly milk cap (Lactarius torminosus) is not yet in our list of 10 lookalikes."],
      },
      lsa: {
        look: [
          ["Cap", "4–7.5 cm, orange to pinkish-buff, sticky, sinking in the middle. Grey-green patches where bruised."],
          ["Gills", "Pale wine-red."],
          ["Stem", "Short, pale pinkish-buff."],
          ["Milk", "Blood-red to purple straight away (not orange first), slowly turning greenish."],
        ],
        where: [
          "Under pines; in Europe often on chalky soil.",
          "In southern Europe it fruits from September to November, and into December in the far south.",
        ],
        danger: [
          "White milk, or milk that turns yellow: a different milk cap.",
          "A pinker cap with a woolly, shaggy edge: the woolly milk cap, which is poisonous.",
        ],
        check: ["Local name: from Wikipedia (\"the bloody one\"). It is not in the Department of Forests leaflet."],
      },
      rde: {
        look: [
          ["Cap", "White, often with ochre-brown stains. Funnel-shaped and rough, often with soil and leaves stuck on it. Can be half buried."],
          ["Gills", "White to cream, close together, running down the stem."],
          ["Stem", "Short, thick and firm. White."],
          ["Flesh", "White. Does not change colour when cut."],
          ["Smell", "Fruity when young; can smell fishy when old."],
        ],
        where: [
          "Pine, broadleaf and mixed woods. Common in the eastern Mediterranean.",
          "In Cyprus: pine forests and shrubland in autumn, earlier than the red pine mushroom.",
          "Often comes up in warm spells.",
        ],
        danger: [`A white mushroom with ${AMANITA_SIGNS}`],
        check: [],
      },
      tca: {
        look: [
          ["Cap", "Pale, covered in chestnut to dark-brown scales. The edge is rolled in, with cottony bits."],
          ["Gills", "Whitish to cream, crowded. Brown spots with age."],
          ["Stem", "A cottony ring. Below it, dark brown bands of scales, like a boot."],
          ["Smell", "Strong and spicy, like nutmeg or allspice."],
          ["Names", "Also called maratheftiko in Cyprus."],
        ],
        where: [
          "Calabrian pine and Troodos black pine forests.",
          "Elsewhere in the Mediterranean also with evergreen oaks, strawberry trees and terebinth.",
          "Autumn and winter, on the coast and in the mountains.",
        ],
        danger: [`${cap1(AMANITA_SIGNS)}`],
        check: [],
      },
      mor: {
        look: [
          ["Cap", "A honeycomb of pits and ridges. Cyprus morels are often cone-shaped, olive-brown to grey."],
          ["Inside", "Cut it in half from top to bottom: true morels are always hollow inside."],
        ],
        where: [
          "Spring. Recently burned areas, forests, meadows and uncultivated land.",
          "Burned Calabrian pine forest, in the years after a fire.",
          "With strawberry trees on the Troodos rocks; lower down also with cypress and hawthorn.",
        ],
        danger: [
          "Brain-like wrinkles instead of pits, or a cotton-filled or chambered inside: a false morel. False morels stay poisonous even after cooking.",
        ],
        check: [
          "Cyprus has several morel species, two of them first described from Cyprus in 2016 (Morchella arbutiphila and M. disparilis). This card covers all morels (the genus Morchella).",
          "False morels (Gyromitra) are not in our list of 10 lookalikes. We found no Cyprus record of them.",
        ],
      },
      slu: {
        look: [
          ["Cap", "Brown, slimy and shiny. The skin peels off."],
          ["Underneath", "A sponge of small pores, not gills. Yellow, then olive."],
          ["Stem", "Pale yellow, with small brown dots. The two slippery Jacks listed for Cyprus have no ring. One other kind (Suillus luteus) has a ring: white on top, dark brown to violet underneath."],
        ],
        where: [
          "Under pines, including planted pines, on poor soil.",
          "Often in groups, after rain.",
        ],
        danger: ["Gills instead of pores: it is not this mushroom."],
        check: [
          "The Cyprus Department of Forests lists Suillus collinitus (no ring, pink stem base) and S. granulatus, but not S. luteus. The local name sfoungaras is from the Department of Forests leaflet, where it names Suillus granulatus.",
        ],
      },
    } as Record<string, FieldNotes>,
    sev: { deadly: "Deadly", toxic: "Toxic" },
    seasonAria: (season: string, month: string) => `Season ${season}. This month is ${month}.`,
    guide: "Mushroom guide",
    lookRowAria: (latin: string, sev: string) => `${latin}, ${sev.toLowerCase()}. Open the photo, with its credit.`,
    lookRowTip: "Tap to see the photo larger, with its author and licence.",
    rowTip: "Open: what to look for, its deadly lookalikes, where and when.",
    inSeason: "In season",
    dangerBtn: "Deadly and toxic lookalikes", learnFirst: "Learn these first.",
    inSeasonIn: (m: number) => `In season in ${MONTH_LONG[m - 1]}`,
    notInSeasonIn: (m: number) => `Not in season in ${MONTH_LONG[m - 1]}`,
    looksIntro: "Watch for these. They can look like the mushrooms on this map. <b>Some can kill.</b>",
    leaveIf: "Leave it alone if you see",
    carAria: (latin: string) => `Photos of ${latin}. Swipe for more.`,
    photoAria: (i: number, n: number, name: string) => `Photo ${i} of ${n}: ${name}. Open larger, with the photo credit.`,
    photoTip: "Tap to see it larger, with the photo's author and licence.",
    /** The line under the Latin name: common name, then the local name (HTML, already escaped). */
    subLine: (common: string, local: string) => `${common}. Local name <b>${local}</b>`,
    spellTip: "Spelling still to confirm with the Cyprus Mycological Association.",
    jump: (n: number) => `<b>${n} deadly lookalikes</b> to watch for. See them at the bottom.`,
    whatToLook: "What to look for",
    notChecked: NOT_CHECKED,
    whereToLook: "Where to look",
    onOurMap: "On our map:",
    when: "When",
    inSeasonNow: (season: string) => `<b>In season now</b> (${season}).`,
    notInSeasonNow: (m: number, season: string, next: number) => `<b>Not in season in ${MONTH_LONG[m - 1]}.</b> Season ${season}: starts in ${MONTH_LONG[next - 1]}.`,
    dangerH: "Danger: lookalikes",
    leaveIfColon: "Leave it alone if you see:",
    watchThese: (n: number, deadly: number) => `Watch for these ${n}. ${deadly} can kill. Tap one to see it larger.`,
    more: "Sources, photo credits and notes",
    backAll: "Back to all mushrooms", backAllTip: "Back to all mushrooms.",
    looksTitle: "Lookalikes", looksSub: "Deadly and toxic",
    listTitle: "Mushrooms", listSub: "Tap one to learn it",
    infoAria: "Sources and credits",
    infoTip: "Sources, photo credits, public records in Cyprus and notes.",
    close: "Close", closeTip: "Close and go back to the map.",
    photoOf: (i: number, n: number) => `Photo ${i} of ${n}`,
    closePhoto: "Close the photo",
    photoAlt: (name: string) => `Photo of ${name}`,
    prev: "Previous photo", next: "Next photo",
    photoBy: "Photo:",
    openInat: "Open on iNaturalist ↗",
    lookCredits: "Photo credits for the lookalikes",
    recTip: (m: string, n: number) => `${m}: ${n} public record${s(n)} in Cyprus.`,
    recTitle: "Public records in Cyprus",
    recLine: (gbif: number, inat: number) => `<b>${gbif}</b> ${gbif === 1 ? "record" : "records"} on GBIF, and <b>${inat}</b>
        expert-checked ${inat === 1 ? "sighting" : "sightings"} on iNaturalist.`,
    recChart: "Public records in Cyprus by month",
    recNote: `Cyprus mushrooms are recorded very little, so these numbers are too small to show a season
        or to say where the species grows. You can help by adding your own sightings to iNaturalist.`,
    infoTitle: "Sources, credits and notes",
    linksNote: "Links open other websites in a new tab.",
    confirmLocal: (local: string) => `The local name ${local}.`,
    confirmLooks: "Which lookalikes matter most for this mushroom. Until then, all are shown.",
    confirmNotes: "The field notes on this page (researched November 2026).",
    confirmH: "Still to confirm with the Cyprus Mycological Association",
    notesFrom: "Where the field notes come from",
    briefNote: "Season, trees and altitude on the map come from the project brief.",
    howH: "How the map uses it",
    how: (trees: string, alt: string, season: string) => `Habitat: ${trees}. ${alt}. Scored only in ${season}.
          Everything else (rain, temperature, soil, shade) is the same as the general map.`,
    photosH: "Photos",
    photosNote: "From iNaturalist. Each photo keeps its author and licence.",
    learnMore: "Learn more",
    whereFromH: "Where this comes from",
    whereFrom: `Seasons, trees and altitudes on the map come from the project brief. The field notes on each mushroom page
        come from the sources listed on that page. Photos come from iNaturalist; tap any photo to see its author and licence.`,
    confirmAll: (n: number) => `The local name gematas, the field notes, and which lookalikes matter most for each mushroom. The other local
        names are from the Cyprus Department of Forests leaflet.
        Until then, all ${n} lookalikes are shown on every mushroom.`,
    collectH: "Collecting in Cyprus",
    collect: ["Allowed in state forests, but not in nature reserves.",
      "No rakes or tools that dig. Do not damage the fungus in the ground.",
      "Leave young mushrooms."],
    allCredits: "Every photo credit, on the About page",
    viewerLabel: "Photo and credit",
  },
};

export type Strings = typeof en;
