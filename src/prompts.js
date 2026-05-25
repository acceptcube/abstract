// abstract — one hundred non representational paintings by Halden Voss.
// Each entry is the single source of truth for one work: form, palette,
// composition, tempo, mood, and the artist's one line statement. The image
// prompt, the metadata, the on chain name, and the on chain attributes all
// derive from these fields. Adjacent ids belong to different form families,
// so the first qualifiers receive visually distinct pieces.
// seed = 200003 + id * 7919.

// No named artist in the image prompt itself: OpenAI's upstream safety
// heuristics flag "by NAME" / "in the style of NAME" patterns. The on chain
// attribution to Halden Voss happens in build-metadata.js. The visual
// vocabulary fuses three abstract instincts into one signature: rigorous
// orthogonal geometric structure in primary color, lyrical geometric forms
// (circles, arcs, triangles) with painterly energy, and controlled all over
// drip skeins of paint.

const LEAD =
  "A bold non representational abstract painting that fuses three visual " +
  "instincts into one signature: rigorous geometric structure (orthogonal " +
  "lines, primary color rectangles, perfect circles, arcs, triangles), " +
  "lyrical painterly energy (broken color, expressive curves, layered " +
  "gestures), and controlled all over drip skeins of paint. Saturated " +
  "primary palette (red, blue, yellow, black, white) augmented by chosen " +
  "secondary and earth tones. Worked oil paint surface, visible brushwork.";

const TAIL =
  "The form is pure; no objects, no figures, no symbols, no representational " +
  "scenes. Museum scale. Absolutely no text, no letters, no numbers, no " +
  "signature, no frame, no border.";

export const FORM_DESCRIPTIONS = {
  color_field:
    "the dominant form is a vast luminous color field, accented by one or two precise geometric elements (a circle, a thin orthogonal line) and a few quiet drip skeins suggesting depth across the worked surface",
  hard_edge:
    "two or three clean geometric shapes in flat primary color with razor sharp boundaries, structured by thin black lines and accented by a single energetic drip skein crossing the composition",
  grid:
    "a rigorous orthogonal grid of rectangles in primary red, blue, yellow, black and white separated by clean black lines, interrupted in two or three cells by a lyrical curve or a thin controlled drip skein",
  gestural:
    "energetic painterly gestures and calligraphic sweeps in primary palette over a faint orthogonal structural ground, drip skeins woven through, geometric circles and arcs emerging from the brushwork",
  drip:
    "controlled drips, splatters and skeins of paint webbed across a stained canvas in an all over composition, with faint orthogonal lines and one or two precise circles emerging beneath the web",
  op:
    "a precise repeating pattern of overlapping circles, arcs and orthogonal lines in primary palette creating optical motion and rhythmic vibration",
  blocks:
    "two or three large flat blocks of saturated primary color stacked or arranged side by side, edges crisp, accented by a drip skein crossing the joins and a single precise circle floating on one block",
  line:
    "a small group of thin black lines and a single perfect primary color circle on a quiet ground, minimal and balanced, with one controlled drip skein for energy",
  monochrome:
    "a near monochrome surface in subtle tonal variations, with a single faint orthogonal grid implied beneath, one quiet circle, and a few drip skeins on the worked surface",
  lyrical:
    "loose lyrical painterly washes and gestures combined with precise geometric circles, arcs and triangles in primary color, drip skeins threading through, a breathing surface",
};

const seedFor = (id) => 200003 + id * 7919;
const promptFor = (e) =>
  `${LEAD}: ${FORM_DESCRIPTIONS[e.form]}. Palette: ${e.palette}. ` +
  `Composition: ${e.composition}. Tempo ${e.tempo}, mood ${e.mood}. ${TAIL}`;

// Authored array. Ids are assigned by array order (1..100). Adjacent ids
// belong to different form families by construction.
const WORKS = [
  // ----- cycle 1 -----
  { title: "Slow Field, North", form: "color_field", palette: "burnt orange and cobalt with bone white edges", composition: "centered vertical band rising from a low horizon", tempo: "breathing", mood: "solemn", story: "A surface that depicts nothing depicts everything it does not depict." },
  { title: "First Position", form: "hard_edge", palette: "pure ultramarine, ivory and black", composition: "a single off center black square on an ultramarine field with an ivory margin", tempo: "deliberate", mood: "austere", story: "A square does not apologize." },
  { title: "Index", form: "grid", palette: "primary red, blue, yellow on warm cream with black lines", composition: "a six by six orthogonal grid, cells unevenly weighted", tempo: "counted", mood: "rational", story: "An index of what colour is when it stays still." },
  { title: "Black Sweep", form: "gestural", palette: "deep ivory black on raw white canvas", composition: "a single broad diagonal sweep from upper left to lower right", tempo: "urgent", mood: "vigorous", story: "The arm decides. I do not." },
  { title: "White Web, Black Floor", form: "drip", palette: "lead white skeins on a deep matte black ground", composition: "an all over woven web, densest near the center", tempo: "torrential", mood: "ecstatic", story: "Gravity is a collaborator." },
  { title: "Pure Stripe", form: "op", palette: "pure black and titanium white", composition: "uniformly spaced vertical stripes filling the canvas", tempo: "vibrating", mood: "dazzling", story: "The eye is the painting." },
  { title: "Carmine Over Navy", form: "blocks", palette: "deep carmine red over deep navy blue", composition: "two horizontal blocks, carmine above, navy below, soft stained edges", tempo: "still", mood: "solemn", story: "Two colours, properly weighted, are a chapel." },
  { title: "Hairline", form: "line", palette: "graphite on bone white gesso", composition: "a single faint horizontal hairline at the lower third of the canvas", tempo: "hushed", mood: "devotional", story: "One line is enough if it is the right one." },
  { title: "Ultramarine All Over", form: "monochrome", palette: "deep ultramarine, varied only by depth of working", composition: "an even all over field with a slightly cooler core", tempo: "still", mood: "profound", story: "One colour is the only test of a painter." },
  { title: "Emerald Crimson Gold", form: "lyrical", palette: "emerald, crimson and warm gold on a cream ground", composition: "a loose central bouquet of washes and gestures", tempo: "lyrical", mood: "jubilant", story: "Emerald and crimson share gold the way two friends share a third." },

  // ----- cycle 2 -----
  { title: "The Long Breath", form: "color_field", palette: "deep oxblood red rising into pale rose", composition: "horizontal stratification across a tall canvas", tempo: "slow", mood: "generous", story: "I painted breath, and only breath." },
  { title: "Black on Black on Ivory", form: "hard_edge", palette: "two values of black on a single ivory ground", composition: "a smaller black square inset within a larger black square", tempo: "exact", mood: "taut", story: "Edge is the only honest claim." },
  { title: "Cantata", form: "grid", palette: "black grid on cream with red, blue and yellow blocks", composition: "a staggered four by five grid, several cells deliberately empty", tempo: "rhythmic", mood: "devout", story: "The cells sing because the lines do not." },
  { title: "Viridian Drag", form: "gestural", palette: "viridian green dragged through titanium white", composition: "overlapping curving arcs filling the upper half", tempo: "swift", mood: "defiant", story: "The sweep is the painting; the canvas is its witness." },
  { title: "Tan Skein", form: "drip", palette: "black skeins on a warm tan ground", composition: "an all over web denser at the edges than the center", tempo: "restless", mood: "wild", story: "I let the paint admit what I would not." },
  { title: "Cobalt Stripe", form: "op", palette: "saturated cobalt and bright white", composition: "uniformly spaced horizontal stripes across the canvas", tempo: "ringing", mood: "severe", story: "Cobalt does not blink." },
  { title: "Three Steps", form: "blocks", palette: "ochre, cream and rust on stained linen", composition: "three horizontal blocks of equal height", tempo: "still", mood: "sublime", story: "I made a stair you stand still on." },
  { title: "Two Whispers", form: "line", palette: "pale prussian blue on warm cream", composition: "two close, almost parallel hairlines in the middle band", tempo: "slow", mood: "attentive", story: "Two whispers are still a sentence." },
  { title: "Oxblood All Over", form: "monochrome", palette: "oxblood red, depth varied by repeated working", composition: "an even all over field with a warmer central glow", tempo: "breathing", mood: "watchful", story: "Oxblood is patience under heat." },
  { title: "Cobalt Tangerine", form: "lyrical", palette: "cobalt blue, tangerine orange and warm cream", composition: "washes cascading from upper left toward lower right", tempo: "breathing", mood: "generous", story: "Cobalt and tangerine kiss without bargain." },

  // ----- cycle 3 -----
  { title: "Lemon Over Violet", form: "color_field", palette: "lemon yellow over deep violet with a hairline lavender split", composition: "lemon upper, violet lower, joined by a narrow lavender seam", tempo: "still", mood: "watchful", story: "Lemon answers violet without a word between them." },
  { title: "Mint Over Sand", form: "hard_edge", palette: "soft mint, warm sand and a single oxblood mark", composition: "a mint rectangle floating above a sand field with a small dark accent", tempo: "terse", mood: "plain", story: "Mint chose sand. I obeyed." },
  { title: "Lattice, Cold", form: "grid", palette: "muted slate, pale ash and frozen cobalt on bone", composition: "a tilted square lattice across the lower two thirds", tempo: "measured", mood: "exacting", story: "Cold is a discipline." },
  { title: "Iron Letter", form: "gestural", palette: "iron grey gestures on a warm ochre ground", composition: "a central explosion of short strokes", tempo: "struck", mood: "raw", story: "I wrote a letter the alphabet refuses." },
  { title: "Aluminum and Cobalt", form: "drip", palette: "aluminum silver and cobalt skeins on cream", composition: "diagonal cascade from upper left to lower right", tempo: "charged", mood: "dense", story: "Aluminium does not glitter. It states." },
  { title: "Red Wave", form: "op", palette: "cadmium red and bright white", composition: "uniform sinusoidal waves across the canvas", tempo: "humming", mood: "exact", story: "Red waves at the speed of a heart." },
  { title: "Cobalt Cream Cobalt", form: "blocks", palette: "cobalt above, cream center, cobalt below", composition: "a horizontal sandwich of three blocks of nearly equal height", tempo: "hush", mood: "generous", story: "Cobalt is the door, cream is the room, cobalt again is leaving." },
  { title: "Graphite Haze", form: "line", palette: "graphite on linen ground", composition: "a soft haze of many faint horizontal pencil lines", tempo: "breathing", mood: "gentle", story: "Graphite gathers what light leaves behind." },
  { title: "Ivory Breath", form: "monochrome", palette: "ivory white worked into an almost imperceptible field", composition: "an even surface with a single breath of cold near one edge", tempo: "suspended", mood: "mute", story: "Ivory keeps a secret it does not say." },
  { title: "Magenta Viridian", form: "lyrical", palette: "magenta, viridian and warm bone", composition: "two veiled overlapping washes meeting in the middle", tempo: "drawn out", mood: "ecstatic", story: "Magenta and viridian work each other and the bone keeps score." },

  // ----- cycle 4 -----
  { title: "Dusk Band", form: "color_field", palette: "emerald green and warm umber with a thin gold band", composition: "an off center horizontal gold band across a deep field", tempo: "hushed", mood: "exultant", story: "The horizon is wherever I decide it is, which is the privilege of painting nothing." },
  { title: "Three Bars", form: "hard_edge", palette: "cadmium red, mustard yellow and ivory", composition: "three vertical bars of equal width on a deep ivory ground", tempo: "struck", mood: "defiant", story: "Three is the smallest number that argues." },
  { title: "Lattice, Warm", form: "grid", palette: "ochre, dusty rose and warm cream on warm linen", composition: "an irregular grid clustered toward the lower right", tempo: "paced", mood: "calm", story: "Warm is its own discipline." },
  { title: "Cream Argument", form: "gestural", palette: "cobalt and bright cream", composition: "broad sweeping strokes argued across the canvas", tempo: "fast", mood: "jubilant", story: "Cream and cobalt argue, and the argument is the picture." },
  { title: "Rust on Dove", form: "drip", palette: "rust and warm ochre skeins on a dove grey ground", composition: "a thin web densest near the upper right corner", tempo: "syncopated", mood: "vibrant", story: "The colour does not need me to make a path." },
  { title: "Emerald Bone", form: "op", palette: "emerald green and bone white", composition: "a fine herringbone pattern over the entire surface", tempo: "oscillating", mood: "sober", story: "Emerald repeated is not emerald." },
  { title: "Black Gold Black", form: "blocks", palette: "matte black, warm gold and matte black", composition: "two black blocks sandwich a narrow gold band", tempo: "weighted", mood: "mournful", story: "Gold between two blacks is not light. It is a sound." },
  { title: "Vertical Marks", form: "line", palette: "charcoal on raw cotton", composition: "a vertical column of short, evenly spaced marks", tempo: "drawn", mood: "patient", story: "Verticals are how I count." },
  { title: "Black with Blue", form: "monochrome", palette: "black layered over a deep blue undertow", composition: "an even surface with a barely seen blue depth", tempo: "still", mood: "severe", story: "Black holds the blue without showing it." },
  { title: "Jade Amber", form: "lyrical", palette: "jade green, amber and warm plum", composition: "an orbital arrangement of soft washes", tempo: "dancing", mood: "lush", story: "Jade and amber are old companions; plum is the new arrival." },

  // ----- cycle 5 -----
  { title: "Cream Margin", form: "color_field", palette: "raw sienna and ultramarine with a cream margin", composition: "full bleed with a narrow cream edge on three sides", tempo: "settled", mood: "mournful", story: "I left the cream alone. It was enough." },
  { title: "Two Bars", form: "hard_edge", palette: "oxblood and pure mint on warm sand", composition: "two thin vertical bars on a wide sand field", tempo: "set", mood: "severe", story: "Two is the smallest number that is true." },
  { title: "Argument in Primaries", form: "grid", palette: "red, blue, yellow blocks divided by thick black lines on cream", composition: "a dense central cluster of cells dissolving toward the edges", tempo: "exact", mood: "intent", story: "Red, blue, yellow refuse to mean anything together. That is the point." },
  { title: "Bone Carmine", form: "gestural", palette: "bone, carmine and umber", composition: "descending strokes filling the right half", tempo: "frantic", mood: "raw", story: "I struck once, and only once, and it was right." },
  { title: "Cinnabar and Pearl", form: "drip", palette: "cinnabar and pearl skeins on a chocolate ground", composition: "a thick web denser at the lower edge", tempo: "beating", mood: "ecstatic", story: "Pearl finds its way without flattering me." },
  { title: "Magenta Aqua", form: "op", palette: "magenta and aqua", composition: "tight sinusoidal waves curving across the canvas", tempo: "beating", mood: "alert", story: "Aqua and magenta agree to disagree." },
  { title: "Rose Crimson", form: "blocks", palette: "rose, warm ivory and crimson", composition: "three horizontal blocks of unequal height", tempo: "low", mood: "contemplative", story: "Rose and crimson know each other too well to argue." },
  { title: "Diagonal Hair", form: "line", palette: "iron oxide on chalk", composition: "a single faint diagonal hairline from corner to corner", tempo: "suspended", mood: "mute", story: "The diagonal will not flatter the rectangle." },
  { title: "Black with Violet", form: "monochrome", palette: "black layered over a deep violet undertow", composition: "an even surface with a barely seen violet inside", tempo: "still", mood: "severe", story: "Violet under black is the work; black is its veil." },
  { title: "Rose Olive", form: "lyrical", palette: "rose, olive green and cobalt on warm cream", composition: "layered washes veiling each other", tempo: "warm", mood: "tender", story: "Rose and olive over cobalt is what I sing when I think I am working." },

  // ----- cycle 6 -----
  { title: "Pale Sapphire Hour", form: "color_field", palette: "cerulean dissolving into chalk and pale sapphire", composition: "soft top, dense lower mass", tempo: "becalmed", mood: "devotional", story: "The hour exists only in the canvas. I painted the hour." },
  { title: "Concentric", form: "hard_edge", palette: "cobalt, vermilion and ivory", composition: "three concentric squares, alternating color, centered", tempo: "hung", mood: "sober", story: "What surrounds is also the painting." },
  { title: "Tilted Field", form: "grid", palette: "pastel rose, pastel green and pastel blue on bone", composition: "a slightly tilted dense grid across the whole canvas", tempo: "told", mood: "sure", story: "The tilt is honesty about the wall the painting hangs on." },
  { title: "Raw Marker", form: "gestural", palette: "warm grey gestures on raw canvas", composition: "long horizontal strokes pulled left to right", tempo: "alive", mood: "awake", story: "Raw canvas takes a sweep the way an ear takes a syllable." },
  { title: "Cobalt Amber Snow", form: "drip", palette: "cobalt and amber skeins on snow", composition: "an all over web with a still center", tempo: "weaving", mood: "restless", story: "Cobalt and amber on snow is a sentence I keep saying." },
  { title: "Ochre Stripe", form: "op", palette: "ochre and deep cobalt", composition: "evenly spaced vertical stripes of two values", tempo: "drawn", mood: "hard", story: "Ochre is not warm if you keep counting." },
  { title: "Saffron Olive", form: "blocks", palette: "saffron, olive and bone", composition: "asymmetric tri block, saffron tall, olive low, bone center", tempo: "resting", mood: "holy", story: "Saffron does not need olive; olive needs saffron." },
  { title: "Off Center", form: "line", palette: "sepia on parchment cream", composition: "a single short horizontal mark in the upper right quadrant", tempo: "lifted", mood: "gentle", story: "I refused the middle and that is the painting." },
  { title: "Bone with Graphite", form: "monochrome", palette: "bone white layered over a graphite undertow", composition: "even working with a cooler corner", tempo: "lifted", mood: "contemplative", story: "Bone is what graphite was before it was used." },
  { title: "Turquoise Carmine", form: "lyrical", palette: "turquoise, carmine and ivory", composition: "veiled overlapping washes filling the canvas", tempo: "lifted", mood: "vivid", story: "Turquoise dares the carmine and the ivory hosts." },

  // ----- cycle 7 -----
  { title: "Carmine Over Black", form: "color_field", palette: "carmine layered over deep black with a thin pink horizon", composition: "deep field with a luminous narrow horizon near the bottom", tempo: "paced", mood: "glowing", story: "Black does not eat carmine. It carries it." },
  { title: "Staircase", form: "hard_edge", palette: "charcoal, sulphur and terracotta on bone", composition: "three rectangles stepping up from lower left to upper right", tempo: "planted", mood: "blunt", story: "The stair does not arrive anywhere; that is its dignity." },
  { title: "Perimeter", form: "grid", palette: "midnight blue grid with cold pale accents on cream", composition: "a perimeter of cells around an empty interior", tempo: "marked", mood: "principled", story: "The middle was empty; the edge was the work." },
  { title: "Burnt Orange Strike", form: "gestural", palette: "jet black on a burnt orange field", composition: "a single hard horizontal whip across the upper third", tempo: "hot", mood: "hungry", story: "Burnt orange is too loud to share. Black answers it." },
  { title: "Three Skeins", form: "drip", palette: "carmine, jade and bone on warm grey", composition: "three overlapping webs, each in one colour, layered", tempo: "weaving", mood: "vibrant", story: "Three skeins is a conversation." },
  { title: "Lemon Stripe", form: "op", palette: "black and lemon yellow", composition: "uniformly spaced vertical stripes", tempo: "dazzling", mood: "bright", story: "Lemon dares the wall to hold it." },
  { title: "Teal Maroon", form: "blocks", palette: "teal, cream and deep maroon", composition: "central glow block of cream between two darker blocks", tempo: "settled", mood: "quiet", story: "Teal hides what maroon admits." },
  { title: "Mid Mark", form: "line", palette: "pencil on raw cotton canvas", composition: "a single short horizontal mark in the exact center", tempo: "calm", mood: "kind", story: "The hair is the painting; the canvas is its silence." },
  { title: "Carmine", form: "monochrome", palette: "carmine red worked deeply across an even surface", composition: "a slight inward pull toward the center", tempo: "paced", mood: "watchful", story: "Carmine is not red; it is a position." },
  { title: "Pewter Gold", form: "lyrical", palette: "pewter, warm gold and ink", composition: "clustered marks at center over a dark ground", tempo: "syncopated", mood: "kind", story: "Pewter and gold against ink is jewelry, not painting; sometimes that is enough." },

  // ----- cycle 8 -----
  { title: "Slim Cadmium", form: "color_field", palette: "ochre and turquoise with a slim band of cadmium", composition: "left heavy with a hairline horizon thin to the right", tempo: "drawn out", mood: "somber", story: "One thin band is the painting; the rest of the painting is its company." },
  { title: "Cantilever", form: "hard_edge", palette: "turquoise, beige and deep prussian blue", composition: "a beam cantilevered off a square mass against an open field", tempo: "fixed", mood: "courteous", story: "I balanced what could fall and chose not to let it." },
  { title: "Cluster", form: "grid", palette: "warm pop pinks, yellows and cyan on cream", composition: "a tight cluster of cells in the central third", tempo: "fixed", mood: "plain", story: "What collects in one corner can be the centre." },
  { title: "Charcoal Sweep", form: "gestural", palette: "ivory sweeps on a deep charcoal ground", composition: "rising strokes from the lower right toward the upper left", tempo: "restless", mood: "bright", story: "Charcoal cleans nothing. It sweeps." },
  { title: "Pearl on Raw", form: "drip", palette: "pearl and graphite skeins on raw canvas", composition: "thin all over web with a slight diagonal cascade", tempo: "falling", mood: "alert", story: "Raw canvas knows what is gift and what is theft." },
  { title: "Vermilion Wave", form: "op", palette: "vermilion and cobalt", composition: "wide sinusoidal waves curving slowly across the canvas", tempo: "sharp", mood: "surgical", story: "Vermilion is a verb." },
  { title: "Oxblood Lavender", form: "blocks", palette: "oxblood, lavender and ivory", composition: "an oxblood block tucked beside a tall lavender block on ivory", tempo: "low", mood: "grave", story: "Oxblood and lavender against ivory is the sentence I came here to write." },
  { title: "Lower Third", form: "line", palette: "ochre on bone", composition: "a single soft mark across the lower third of the canvas", tempo: "drawn", mood: "sober", story: "The lower third holds because it was given the weight." },
  { title: "Jade", form: "monochrome", palette: "jade green worked into a steady surface", composition: "even all over with a darker lower band implied", tempo: "even", mood: "contemplative", story: "Jade is what green would be if it kept its word." },
  { title: "Lemon Sapphire", form: "lyrical", palette: "lemon, sapphire and chalk", composition: "a long horizontal flow of washes across the middle", tempo: "paced", mood: "electric", story: "Lemon shouts at sapphire and the chalk explains." },

  // ----- cycle 9 -----
  { title: "Charged Interior", form: "color_field", palette: "bone, mushroom and a charged interior of warm rose", composition: "central focal mass of warm rose within a quiet surround", tempo: "suspended", mood: "calm", story: "Inside the field there is a place that does not belong to colour. I painted that place." },
  { title: "Ring Over Bar", form: "hard_edge", palette: "magenta, lemon and matte asphalt", composition: "a magenta ring above a lemon horizontal bar on asphalt", tempo: "posted", mood: "hard", story: "The ring contains. The bar declares." },
  { title: "Marked", form: "grid", palette: "sage and cinnabar on cream with thin black lines", composition: "a dense grid with several cells deliberately marked over", tempo: "told", mood: "principled", story: "I marked the canvas the way one marks a calendar." },
  { title: "Olive Whip", form: "gestural", palette: "pale rose on an olive ground", composition: "a broken horizontal whip across the middle", tempo: "hammered", mood: "electric", story: "I whipped the olive ground and stopped." },
  { title: "Magenta in Ink", form: "drip", palette: "magenta and sulphur skeins on a deep ink ground", composition: "a chaotic web with a still center", tempo: "urgent", mood: "charged", story: "Magenta in ink is a refusal." },
  { title: "Ink Wave", form: "op", palette: "ivory and ink", composition: "tight expanding rings of two values", tempo: "exact", mood: "clean", story: "Ink waves are not waves; they are a count." },
  { title: "Cadmium Chartreuse", form: "blocks", palette: "cadmium, chartreuse and charcoal", composition: "a tilted block of chartreuse cantilevered against a cadmium ground over charcoal", tempo: "suspended", mood: "devotional", story: "Chartreuse over charcoal is rude in the right way." },
  { title: "Upper Third", form: "line", palette: "lavender on pale grey", composition: "a single thin lavender line across the upper third", tempo: "lifted", mood: "still", story: "The upper third floats because it was given the air." },
  { title: "Pewter", form: "monochrome", palette: "pewter worked into a metallic still surface", composition: "even all over with a faint warmer center", tempo: "paced", mood: "austere", story: "Pewter is the metal of attention." },
  { title: "Rust Lavender", form: "lyrical", palette: "rust, lavender and bone", composition: "scattered constellation of washes and small marks", tempo: "warm", mood: "voluptuous", story: "Rust over lavender on bone is the colour of an evening I will not name." },

  // ----- cycle 10 -----
  { title: "Amber Pulse", form: "color_field", palette: "ash purple over dawn cream with a faint amber pulse", composition: "an even surface with a barely seen amber heartbeat", tempo: "lifted", mood: "voluptuous", story: "The pulse is the work." },
  { title: "Nested", form: "hard_edge", palette: "saffron, ink and dove grey", composition: "three nested squares, each smaller and darker, centered", tempo: "set", mood: "hard", story: "One inside the next is what depth is, without the lie of distance." },
  { title: "Order", form: "grid", palette: "coral, cobalt and cream on bone with thin black lines", composition: "a steady full bleed grid across the whole canvas", tempo: "drawn", mood: "ordered", story: "Order is what I have instead of belief." },
  { title: "Copper Letter", form: "gestural", palette: "copper drags on a graphite ground", composition: "aligned vertical strokes across the canvas", tempo: "hammered", mood: "hot", story: "Copper writes nothing it cannot prove." },
  { title: "Copper Midnight", form: "drip", palette: "copper and pearl skeins on a midnight blue ground", composition: "overlapping concentric webs around an off center point", tempo: "hammered", mood: "raw", story: "Copper writes itself." },
  { title: "Silver Stripe", form: "op", palette: "silver and black", composition: "a tight optical spiral implied through stripes", tempo: "urgent", mood: "electric", story: "Silver is the only metal that will sit still." },
  { title: "Pearl Mauve", form: "blocks", palette: "pearl, mauve and graphite", composition: "a floating pearl block over a mauve and graphite field", tempo: "weighted", mood: "peaceful", story: "Pearl over mauve is a memory I refuse to lose." },
  { title: "Cross", form: "line", palette: "iron oxide on pearl", composition: "a single light cross of two thin lines off the center", tempo: "still", mood: "grave", story: "A cross is an honest shape; nothing crosses but the lines." },
  { title: "Rose", form: "monochrome", palette: "rose, layered into an even still surface", composition: "even all over with a faint cooler upper band", tempo: "weighted", mood: "quiet", story: "Rose is older than red and more polite." },
  { title: "Coral Viridian", form: "lyrical", palette: "coral, viridian and pearl", composition: "tangled middle with quieter margins", tempo: "brisk", mood: "glad", story: "Coral and viridian on pearl is generosity itself." },
];

if (WORKS.length !== 100) {
  throw new Error(`WORKS must be 100, got ${WORKS.length}`);
}

export const PROMPTS = WORKS.map((w, i) => {
  const id = i + 1;
  const motif = w.form;
  return {
    id,
    seed: seedFor(id),
    title: w.title,
    form: w.form,
    palette: w.palette,
    composition: w.composition,
    tempo: w.tempo,
    mood: w.mood,
    story: w.story,
    motif,
    prompt: promptFor(w),
  };
});
