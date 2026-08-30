/* ==========================================================================
   CONTENT.JS
   Every piece of editable wedding info lives here. Update dates, venue
   details, hotels, restaurants, and FAQ answers in this single file —
   no need to touch the HTML/CSS to make changes.
   Fields marked TBD are placeholders; search "TBD" to find them all.
   ========================================================================== */

const WEDDING = {
  couple: { partnerOne: "Caitlin", partnerTwo: "Paul", fullNames: "Caitlin & Paul Uhrmacher" },
  date: { iso: "2027-10-16T17:00:00-06:00", display: "October 16, 2027", short: "10.16.27" },
  location: { city: "Mexico City", country: "Mexico", venue: "Casa Xipe" },
  rsvpDeadline: "August 1, 2027",
};

// Countdown target — used by main.js
const COUNTDOWN_TARGET = new Date(WEDDING.date.iso);

const SCHEDULE = [
  { time: "TBD", title: "Ceremony", desc: "Casa Xipe — details to come. We'll share exact timing as we lock in the run of show." },
  { time: "TBD", title: "Cocktail Hour", desc: "Mezcal, snacks, and a chance to say hello before dinner. Location and timing TBD." },
  { time: "TBD", title: "Reception", desc: "Dinner, dancing, and toasts. Full details coming as we finalize plans with Casa Xipe." },
];

// Full wedding-weekend schedule — used on the-wedding.html to show all three days.
const WEEKEND_SCHEDULE = [
  {
    day: "Friday, October 15",
    label: "Welcome",
    events: [
      { time: "TBD", title: "Welcome Party", desc: "Very casual — margaritas, mezcal, beers, and tacos to kick off the weekend and catch up with friendly faces before the big day. Location and timing TBD." },
    ],
  },
  {
    day: "Saturday, October 16",
    label: "The Wedding",
    events: SCHEDULE,
  },
];

const DRESS_CODE = {
  label: "Cocktail Attire",
  note: "Think: a step up from what you'd wear to a nice dinner, a step down from black tie. For most, that means a suit or dressy separates, or a cocktail dress or dressy jumpsuit. Mexico City in October is mild, so leave room for a light layer once the sun goes down — and comfortable shoes are always a good idea; Casa Xipe has some outdoor space.",
};

const TRANSPORTATION = {
  note: "We'll be running a shuttle straight from the InterContinental Presidente Mexico City to Casa Xipe and back for the wedding, so anyone staying there is all set. Staying elsewhere? Uber is reliable and inexpensive throughout Mexico City — more on that in the Travel section.",
};

/* -------------------------------------------------------------------- */
/* TRAVEL                                                                */
/* -------------------------------------------------------------------- */

const AT_A_GLANCE = [
  { label: "Currency", value: "Mexican Peso (MXN)" },
  { label: "Language", value: "Spanish" },
  { label: "Time Zone", value: "Central Time (CST)" },
  { label: "October Weather", value: "70s°F days, cool nights" },
  { label: "Airport", value: "Mexico City Int'l (MEX)" },
  { label: "Elevation", value: "~7,350 ft above sea level" },
];

const BEFORE_YOU_GO = [
  { title: "Passport", body: "A valid passport is required for all U.S. and international travelers. Make sure yours won't expire within six months of your travel dates." },
  { title: "Entry Requirements", body: "Most visitors (including U.S., Canadian, and E.U. citizens) do not need a visa for stays under 180 days — just a valid passport and a completed tourist entry form, which is usually handled on the plane or at immigration." },
  { title: "Flights", body: "Mexico City International Airport (MEX) is served by nearly every major U.S. and international carrier, with frequent direct flights from most major cities. Book early — October is a lovely time to visit and flights fill up." },
  { title: "Travel Insurance", body: "Not required, but worth considering for peace of mind on international travel, especially given the altitude (more below)." },
  { title: "Currency", body: "The Mexican peso (MXN). You'll get a better exchange rate withdrawing pesos from an ATM in Mexico City than exchanging cash at home or at the airport." },
  { title: "Credit Cards", body: "Widely accepted at hotels, restaurants, and shops. It's smart to carry some cash (pesos) for taxis, markets, and smaller spots. Let your bank know you're traveling internationally." },
  { title: "eSIM / Phone Service", body: "An eSIM (Airalo, Holafly, or through your carrier) is the easiest way to have data on arrival. Most major U.S. carriers also offer reasonably priced international day-pass plans." },
];

const GETTING_TO_CDMX = [
  { title: "Mexico City International Airport (MEX)", body: "The main airport for the city, located about 8 miles (a 25–45 minute drive, depending on traffic) from the hotel neighborhoods we recommend. It has two terminals — double check which one your flight uses." },
  { title: "From the Airport", body: "Uber and official airport taxis both operate from MEX. Uber is generally the easiest and most affordable option — just walk to the designated pickup zone (follow signs) rather than the taxi stands right outside baggage claim." },
  { title: "Airport Transfers", body: "Some hotels offer private transfer service on request. We'll share group transportation options for arrival days as they're finalized." },
];

const GETTING_AROUND = [
  { title: "Uber", body: "The easiest way to get around for most visitors — inexpensive, reliable, and available nearly everywhere. This will likely be your default." },
  { title: "Walking", body: "Condesa, Roma Norte, and much of Polanco are genuinely wonderful to walk — tree-lined streets, parks, and no shortage of places to stop for a coffee or a snack." },
  { title: "Metro", body: "Extensive and very cheap, though it can be extremely crowded at rush hour. A fun way to feel like a local if you're not carrying much." },
  { title: "Taxis", body: "Street taxis exist but we'd recommend sticking to Uber or hotel-arranged taxis for simplicity and safety." },
];

const GOOD_TO_KNOW = [
  { title: "Weather in October", body: "Mild and pleasant — sunny days in the low-to-mid 70s°F, cooler nights in the 50s°F. It's the tail end of rainy season, so afternoon showers are possible; pack a light layer and a compact umbrella." },
  { title: "Altitude", body: "Mexico City sits at about 7,350 feet above sea level — noticeably higher than most U.S. cities. Some guests feel it (shortness of breath, tiring more easily); staying hydrated and taking it easy the first day helps a lot." },
  { title: "Electrical Outlets", body: "Same as the U.S. and Canada — Type A/B outlets, 127V. No adapter needed for most North American travelers." },
  { title: "Tipping", body: "Common and appreciated: around 10–15% at restaurants, and small tips for hotel staff, taxi/Uber drivers, and porters." },
  { title: "Drinking Water", body: "Stick to bottled or filtered water, which is what most hotels and restaurants serve automatically. Ice at reputable restaurants and hotels is generally made from purified water." },
  { title: "Spanish", body: "Helpful but not required — English is widely spoken in the neighborhoods and hotels we recommend, and everyone appreciates a friendly 'gracias.' Don't worry, though: the ceremony itself will be in English, no pop quiz required." },
  { title: "Getting Around Safely", body: "Mexico City is a huge, modern, well-traveled capital, and the neighborhoods where we're spending time are safe, walkable, and popular with both locals and visitors. As anywhere, keep an eye on your belongings, stick to Uber or licensed taxis at night, and use normal city common sense." },
];

/* -------------------------------------------------------------------- */
/* STAY — Neighborhoods & Hotels                                        */
/* -------------------------------------------------------------------- */

const NEIGHBORHOODS = [
  {
    id: "polanco",
    name: "Polanco",
    vibe: "Where We're Staying",
    bestFor: "Everyone — it's where our room block and wedding-day shuttle are",
    tone: "tone-3",
    img: "assets/img/polanco-neighborhood.jpg",
    description: "To keep things simple, we're recommending everyone stay in Polanco — Mexico City's most polished neighborhood, with wide tree-lined avenues, world-class restaurants, high-end shopping, and several great museums nearby. It's also where our wedding-day shuttle picks up and drops off, so staying here (or nearby) means you're covered.",
    hotels: [
      { name: "InterContinental Presidente Mexico City", tier: "$$$", desc: "We've secured an affordable room block here for our guests — a large, reliable property right in the heart of Polanco. This is our main recommendation. We'll also be running a shuttle straight from here to Casa Xipe and back on the wedding day.", roomBlock: true, img: "assets/img/hotel-intercontinental-presidente.jpg" },
      { name: "Hyatt Regency Mexico City", tier: "$$–$$$", desc: "A polished, full-service hotel just up the block from the InterContinental on Campos Elíseos — a nice middle ground between our room block and the more budget-friendly option below. A couple minutes' walk to catch the wedding shuttle.", img: "assets/img/hotel-hyatt-regency.jpg" },
      { name: "Residence L'Heritage Tennyson by BlueBay", tier: "$$", desc: "A more affordable apartment-style option a short walk from the InterContinental. You can still meet up with everyone there to catch the shuttle.", img: "assets/img/hotel-residence-lheritage.jpg" },
    ],
  },
];

/* -------------------------------------------------------------------- */
/* EXPLORE CDMX                                                         */
/* -------------------------------------------------------------------- */

const MUST_DO = [
  { name: "Museo Nacional de Antropología", neighborhood: "Chapultepec", desc: "One of the great museums of the world — an unhurried few hours here rewards you many times over.", price: "$", img: "assets/img/museo-antropologia.jpg" },
  { name: "Bosque de Chapultepec", neighborhood: "Chapultepec", desc: "A park more than twice the size of Central Park, with a castle, lakes, and several museums inside it.", price: "Free", img: "assets/img/bosque-chapultepec.jpg" },
  { name: "Museo Frida Kahlo (Casa Azul)", neighborhood: "Coyoacán", desc: "Frida Kahlo's family home, now a museum — book timed tickets in advance, they sell out.", price: "$$", img: "assets/img/museo-frida-kahlo.jpg" },
  { name: "Centro Histórico", neighborhood: "Historic Center", desc: "The city's original core — the Zócalo, the Metropolitan Cathedral, and Templo Mayor's Aztec ruins, all within a few blocks.", price: "Free", img: "assets/img/centro-historico.jpg" },
  { name: "Palacio de Bellas Artes", neighborhood: "Historic Center", desc: "A stunning Art Nouveau/Art Deco theater and museum — even the outside is worth the walk.", price: "$", img: "assets/img/palacio-bellas-artes.jpg" },
];

const NEIGHBORHOODS_EXPLORE = [
  { name: "Condesa", desc: "Leafy, Art Deco, endlessly strollable — a favorite for a slow morning walk." },
  { name: "Roma Norte", desc: "Design, food, and natural wine — the city's creative center of gravity right now." },
  { name: "Polanco", desc: "Polished and upscale, with some of the city's best fine dining." },
  { name: "Coyoacán", desc: "Cobblestone streets, colorful colonial buildings, and a lively central market." },
  { name: "Juárez", desc: "Quietly one of the best-kept secrets — great bars and restaurants without the crowds." },
];

const FOOD_AND_DRINK = [
  { category: "Tacos", desc: "From taquerías to trompo stands — ask any local for their favorite, everyone has strong opinions." },
  { category: "Restaurants", desc: "Mexico City's fine dining scene is world-class; reservations for the best spots go fast." },
  { category: "Coffee", desc: "A serious specialty coffee scene, concentrated in Roma and Condesa." },
  { category: "Mezcal", desc: "Mexico City's mezcalerías are a great way to spend an evening — start slow, it sneaks up on you." },
  { category: "Cocktails", desc: "Several bars here regularly land on 'World's Best' lists — worth dressing up for one night." },
  { category: "Bakeries", desc: "Excellent French-leaning pastry culture alongside classic pan dulce — try both." },
  { category: "Markets", desc: "Mercado Roma and Mercado de San Juan are great for a casual, wander-and-graze lunch." },
];

const DAY_TRIPS = [
  { name: "Teotihuacán", desc: "Ancient pyramids about an hour outside the city — go early to beat the heat and crowds.", time: "Half day" },
  { name: "Xochimilco", desc: "Colorful gondola-style boats (trajineras) through historic canals — lively, festive, best with a group.", time: "Half day" },
  { name: "Puebla", desc: "A beautiful colonial city about two hours away, known for its architecture and mole poblano.", time: "Full day" },
  { name: "Valle de Bravo", desc: "A lakeside mountain town popular with weekending Chilangos — a quieter, scenic escape.", time: "Full day" },
];

const FAVORITES = {
  note: "This is our running list of the spots we love most — the places we'd take our own friends. We'll keep adding to it before the wedding, so check back.",
  items: [
    { name: "Your Favorite Taco Spot", desc: "Caitlin & Paul — add your pick here.", placeholder: true },
    { name: "Your Favorite Cocktail Bar", desc: "Caitlin & Paul — add your pick here.", placeholder: true },
    { name: "Your Favorite Museum or Walk", desc: "Caitlin & Paul — add your pick here.", placeholder: true },
  ],
};

/* -------------------------------------------------------------------- */
/* FAQ                                                                   */
/* -------------------------------------------------------------------- */

const FAQ = [
  {
    category: "Travel & Entry",
    items: [
      { q: "Do I need a passport?", a: "Yes — a valid passport is required for all travelers, with at least six months of validity remaining from your travel dates." },
      { q: "Do I need a visa?", a: "Most guests (U.S., Canadian, and E.U. passport holders) do not need a visa for short stays. You'll fill out a quick tourist entry form upon arrival." },
      { q: "What airport should I fly into?", a: "Mexico City International Airport (MEX) — it's the main airport and the most convenient to all of our recommended neighborhoods." },
      { q: "Should I arrive early because of the altitude?", a: "It's not a bad idea. Mexico City sits at about 7,350 feet, and some guests feel a little winded or tired the first day. Arriving a day early gives you time to acclimate before the festivities." },
      { q: "Will I have cell service?", a: "An eSIM (Airalo, Holafly, or through your carrier) is the easiest way to have data as soon as you land. Most major U.S. carriers also offer affordable international day-pass plans, and WiFi is widely available at hotels and restaurants." },
      { q: "Do I need a power adapter?", a: "No — Mexico uses the same outlets as the U.S. and Canada (Type A/B, 127V), so your regular chargers will work without an adapter." },
    ],
  },
  {
    category: "Staying & Getting Around",
    items: [
      { q: "Where should I stay?", a: "We've secured an affordable room block at the InterContinental Presidente Mexico City in Polanco, and that's our main recommendation — it keeps everyone in the same place and it's where our wedding-day shuttle picks up. If you'd like a nearby alternative, the Hyatt Regency Mexico City is a couple minutes' walk away, or for something more affordable, Residence L'Heritage Tennyson by BlueBay is also a short walk — both still put you in range of the shuttle. See our Stay page for details." },
      { q: "How many days should I stay?", a: "We'd suggest at least 3–4 nights if you can swing it — enough time to enjoy the wedding weekend and still explore the city a bit." },
      { q: "Is Mexico City safe?", a: "Yes — it's a huge, modern capital city, and the neighborhoods we're recommending are safe, walkable, and popular with visitors. Normal city precautions apply, as they would in any major city." },
      { q: "Should I rent a car?", a: "Please don't — parking is extremely difficult in Mexico City, and traffic can be a lot to deal with. Get around using Uber instead. It's safe and inexpensive, and available nearly everywhere you'll be." },
      { q: "Can I use Uber?", a: "Yes, and we'd recommend it — it's reliable, inexpensive, and the easiest way to get around." },
      { q: "Is transportation provided for the wedding?", a: "Yes — we're running a shuttle from the InterContinental Presidente Mexico City to Casa Xipe and back. If you're staying elsewhere, Uber is a great option." },
    ],
  },
  {
    category: "Money & Practical Stuff",
    items: [
      { q: "Can I use my credit card?", a: "Yes, credit cards are widely accepted at hotels, restaurants, and most shops. It's smart to carry some cash for taxis, markets, and smaller spots." },
      { q: "Should I bring pesos?", a: "You don't need to bring cash from home — you'll get a better rate withdrawing pesos from an ATM once you land." },
      { q: "Should I tip?", a: "Yes — tipping is customary and appreciated. Around 10–15% at restaurants, and it's good practice to tip hotel staff, taxi/Uber drivers, and porters a bit as well." },
      { q: "What is the weather like in October?", a: "Mild and pleasant — sunny days in the low-to-mid 70s°F, cooler in the evenings. Pack a light layer for after dark." },
      { q: "Do I need to speak Spanish?", a: "Not at all — English is widely spoken in the neighborhoods and hotels we're recommending, though locals always appreciate an attempted 'gracias.' And don't worry: the ceremony will be in English, so no pop quiz on the day." },
    ],
  },
  {
    category: "The Wedding",
    items: [
      { q: "What should I wear?", a: "Cocktail attire. Think a suit or dressy separates, or a cocktail dress or dressy jumpsuit — see the Dress Code section on our Wedding page for more detail." },
      { q: "What time does the wedding end?", a: "TBD — we'll share the full day-of timeline as it's finalized." },
      { q: "Are children invited?", a: "We love your kids truly, but are only able to welcome the little ones named on your invitation. We will be happy to find and coordinate a babysitter for the evening, just let us know — we're glad to help." },
      { q: "Can I bring a plus-one?", a: "Please check your invitation — plus-ones are noted there. Reach out to us directly if you have any questions." },
    ],
  },
  {
    category: "RSVP",
    items: [
      { q: "What happens after I RSVP?", a: "You're all set! Your RSVP includes your meal choice and where you're staying, so there's nothing else to do unless your plans change — in that case, just reach out and let us know. We'll follow up closer to the date with any final details." },
      { q: "By when do I need to RSVP?", a: "Please RSVP by " + WEDDING.rsvpDeadline + " so we can finalize headcounts with our vendors." },
    ],
  },
];

/* -------------------------------------------------------------------- */
/* RSVP form config                                                      */
/* -------------------------------------------------------------------- */

const MEAL_OPTIONS = ["Select a meal", "Beef", "Fish", "Vegetarian", "Vegan", "Kids' Menu"];
const HOTEL_OPTIONS = ["Select a hotel / not yet booked", "InterContinental Presidente Mexico City (room block)", "Hyatt Regency Mexico City", "Residence L'Heritage Tennyson by BlueBay", "Other hotel near the InterContinental", "Other / not staying near the InterContinental"];
