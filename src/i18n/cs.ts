/**
 * Czech localization.
 *
 * Guidelines:
 * - Gender-neutral: Avoid gendered past tense ("udělal jsi", "přišla jsi").
 *   Use noun phrases, impersonal "to", or present tense instead.
 * - No fragments: Czech doesn't work well with English-style short fragments.
 *   Use flowing sentences that sound like natural internal monologue.
 * - Lowercase in sentences: Day/time names are lowercase mid-sentence.
 *   Use daysLower/timeBlocksLower for in-sentence use.
 * - Plurals: Czech has 3 forms (1, 2-4, 5+). Use the pl() helper.
 */

import type { Day, TimeBlock } from "../state";
import { pickVariant } from "../utils/random";
import type { Strings } from "./types";

/**
 * Czech plural: returns "1 bod", "3 body", "5 bodů".
 * Czech has three forms: singular (1), few (2-4), many (5+).
 */
const pl = (n: number, one: string, few: string, many: string) =>
	`${n} ${n === 1 ? one : n >= 2 && n <= 4 ? few : many}`;

/** Day names for standalone display (headers, titles). */
const days: Record<Day, string> = {
	monday: "Pondělí",
	tuesday: "Úterý",
	wednesday: "Středa",
	thursday: "Čtvrtek",
	friday: "Pátek",
	saturday: "Sobota",
	sunday: "Neděle",
};

/** Day names for use within sentences (lowercase in Czech). */
const daysLower: Record<Day, string> = {
	monday: "pondělí",
	tuesday: "úterý",
	wednesday: "středa",
	thursday: "čtvrtek",
	friday: "pátek",
	saturday: "sobota",
	sunday: "neděle",
};

/** Time block names for standalone display (headers). */
const timeBlocks: Record<TimeBlock, string> = {
	morning: "Ráno",
	afternoon: "Odpoledne",
	evening: "Večer",
	night: "Noc",
};

/** Time block names for use within sentences (lowercase in Czech). */
const timeBlocksLower: Record<TimeBlock, string> = {
	morning: "ráno",
	afternoon: "odpoledne",
	evening: "večer",
	night: "noc",
};

/**
 * Czech strings.
 * Uses `satisfies Strings` to ensure all keys match English.
 */
export const cs = {
	days,
	timeBlocks,
	game: {
		// Task panel
		selectTask: "Vyber úkol",
		attempt: "Zkusit",
		done: "Hotovo",
		failedCount: (n: number) => `Nepovedlo se ${n}x tento týden`,
		costPoints: (n: number) => pl(n, "bod", "body", "bodů"),

		// Time/slots
		slots: (n: number) => pl(n, "slot zbývá", "sloty zbývají", "slotů zbývá"),
		points: (n: number) => pl(n, "bod", "body", "bodů"),
		lateNight: "Pozdní noc",

		// Actions
		checkPhone: "Zkontrolovat telefon",
		newGame: "Nová hra",
		newGameConfirm: "Začít novou hru? Aktuální postup bude ztracen.",
		skipTo: (block: TimeBlock) => `Přeskočit na ${timeBlocksLower[block]}`,
		endDay: "Ukončit den",
		continue: "Pokračovat",
		continueTo: (block: TimeBlock) => `Přejít na ${timeBlocksLower[block]}`,

		// Task name formatting (weekends)
		taskWithTime: (name: string, block: TimeBlock) =>
			`${name} (${timeBlocksLower[block]})`,
		taskWithCost: (name: string, cost: number) => `${name} [${cost}b]`,

		// Night choice
		nightTitle: (day: Day) => `${days[day]} v noci`,
		nightPrompt: [
			"Je pozdě a spánek by teoreticky byl možnost, jenže...",
			"Spánek by byl rozumná volba, ale rozum zrovna moc nefunguje.",
			"Teď by se dalo jít spát, nebo to prostě ignorovat.",
			"Jít spát je možnost, ale ne jediná.",
		],
		sleep: "Spát",
		pushThrough: "Vydržet",

		// Friend rescue
		rescueCost: (cost: string) => `Setkání zabere ${cost}`,
		rescueDecline: [
			"Teď ne",
			"Dneska to nejde",
			"Možná jindy",
			"Jindy, jo?",
			"Teď to prostě nejde",
			"Sorry, teď fakt ne",
		],

		// Day summary
		taskStats: (succeeded: number, attempted: number) =>
			`${succeeded} z ${attempted} úkolů`,
		allNighterTitle: (day: Day, nextDay: Day | null) =>
			nextDay ? `${days[day]} / ${days[nextDay]}` : `${days[day]} (pozdě)`,
		allNighterNarrative: (_day: Day, nextDay: Day | null, seed: number) => {
			const next = nextDay ? daysLower[nextDay] : "další den";
			return pickVariant(
				[
					`Noc se táhla donekonečna. Pak najednou ${next}. Někde v tom to skončilo.`,
					`Někdy v noci se to zlomilo a pak bylo ${next}, asi.`,
					`Čas přestal dávat smysl. Najednou ${next}.`,
					`Noc? Den? Už je ${next}. To je asi podstatný.`,
				],
				seed,
			);
		},

		// Week complete
		weekComplete: "Týden dokončen",
		startNewWeek: "Začít nový týden",
	},

	intro: {
		title: "Skill Issue",
		description: "Zvládni týden. Klikej na úkoly. Hodně štěstí.",
		start: "Začít",
	},

	a11y: {
		// Screen announcements
		screenNightChoice: "Noc",
		screenFriendRescue: "Kamarád se ozývá",
		screenDaySummary: "Shrnutí dne",
		screenWeekComplete: "Konec týdne",

		// Buttons
		openA11yDialog: "Přístupnost",

		// Landmarks & navigation
		skipLink: "Přeskočit na obsah",
		mainGame: "Hra",
		taskList: "Úkoly",
		taskPanel: "Vybraný úkol",
		gameActions: "Akce",

		// Live announcements
		taskSucceeded: (name: string) => `${name} splněno`,
		slotUsed: "Slot využit",
		pointsUsed: (n: number) =>
			pl(n, "bod využit", "body využity", "bodů využito"),
		screenChanged: (screen: string) => `Obrazovka: ${screen}`,
		timeBlockChanged: (block: TimeBlock) => `Teď je ${timeBlocksLower[block]}`,
		gameLoaded: (
			day: Day,
			block: TimeBlock,
			isWeekend: boolean,
			slotsOrPoints: number,
			selectedTaskName?: string,
		) => {
			const dayTime = isWeekend
				? days[day]
				: `${days[day]} ${timeBlocksLower[block]}`;
			const resources = isWeekend
				? pl(slotsOrPoints, "bod", "body", "bodů")
				: pl(slotsOrPoints, "slot zbývá", "sloty zbývají", "slotů zbývá");
			const selected = selectedTaskName ? `${selectedTaskName} vybráno` : "";
			return `${[dayTime, resources, selected].filter(Boolean).join(". ")}.`;
		},

		// Task states
		selected: "vybráno",
		completedToday: "splněno dnes",

		// Panel focus announcement
		panelAnnounce: (
			taskName: string,
			canAttempt: boolean,
			failureCount: number,
			urgency?: string,
			variantName?: string,
		) => {
			const parts = [taskName];
			if (failureCount > 0) {
				parts.push(`Nepovedlo se ${failureCount}x`);
			}
			if (urgency) parts.push(urgency);
			parts.push(canAttempt ? "Pokus dostupný" : "Hotovo");
			if (variantName && canAttempt) parts.push(`Nebo: ${variantName}`);
			return `${parts.join(". ")}.`;
		},

		// Urgency (for Walk Dog)
		urgency: (level: string) => `Naléhavost: ${level}`,

		// Variant available
		variantAvailable: (name: string) => `Nebo zkus: ${name}.`,
	},

	a11yStatement: {
		title: "Přístupnost",
		close: "Zavřít",

		// Support section
		supportTitle: "Podpora",
		screenReaders: "Čtečky obrazovky",
		screenReadersValue: "Podporováno",
		keyboard: "Ovládání klávesnicí",
		keyboardValue: "Plné",
		reducedMotion: "Omezený pohyb",
		reducedMotionValue: "Respektováno",

		// Controls section
		controlsTitle: "Ovládání",
		controlTab: "Navigace",
		controlUpDown: "Pohyb mezi úkoly",
		controlRightEnter: "Vybrat úkol / otevřít detaily",
		controlLeftEsc: "Zrušit výběr / zavřít detaily",
		controlActivate: "Pokusit se o úkol",
		controlEscape: "Zavřít dialogy",

		// About section
		aboutTitle: "O této hře",
		unreliableClicks: "Nespolehlivé klikání",
		unreliableClicksValue: "Záměr - simuluje exekutivní dysfunkci",
		silentFailures: "Tiché neúspěchy",
		silentFailuresValue: "Bez oznámení - absence úspěchu je signál",
		hiddenState: "Skrytá energie/momentum",
		hiddenStateValue: "Záměr - objevování vzorců je součást hry",

		// Contact
		contact: "Našli jste bariéru? Dejte mi vědět.",
	},

	phoneOutcomes: {
		void: [
			"Nic nového, což tě vlastně nepřekvapuje.",
			"Algoritmus děkuje za pozornost.",
			"No, tak to bylo k ničemu.",
			"Azor se na tebe podívá a odvrátí pohled.",
			"Zdá se ti, že pes vzdychl, ale možná si to jen představuješ.",
			"Nic tam nebylo, jak se dalo čekat.",
			"Čas plyne a nic se nemění.",
			"Scrollování dokončeno, výsledek nulový.",
		],
		scrollHole: [
			"Jedno mrknutí a hodina pryč.",
			"Tentokrát tě to vtáhlo víc než obvykle.",
			"Kam se poděl ten čas?",
			"Pořádně tě to vtáhlo.",
			"Tohle bylo horší než obvykle.",
			"Algoritmus tentokrát vyhrál.",
			"Tak co to vlastně bylo?",
		],
		actualBreak: [
			"Hele, to bylo vlastně docela fajn.",
			"Jeden meme tě rozesmál, a to se počítá.",
			"Něco tam bylo, co trochu rozveselilo.",
			"Krátká úleva, a teď zase zpátky.",
			"Aspoň chvíle, která stála za to.",
			"Odkládáš telefon s čistým svědomím.",
		],
		somethingNice: [
			"Kamarád něco sdílel a na chvíli vás to spojilo.",
			"Někdo sdílel dobrou zprávu a trochu to pomohlo.",
			"Připomínka, že lidi existují. To je vlastně fajn.",
			"Přišla zpráva od někoho, kdo na tebe myslí.",
			"Něco ve feedu opravdu stálo za pozornost.",
			"Skutečné lidské spojení, i když jen na chvíli.",
		],
		usefulFind: [
			"Počkat, tohle je vlastně užitečné.",
			"Hele, tohle by mohlo pomoct.",
			"Produktivní scrollování? To je novinka.",
			"Algoritmus dodal něco, co má smysl.",
			"Skutečně užitečná věc, to se nevidí každý den.",
			"Něco zaklaplo a máš nápad, jak si věci usnadnit.",
		],
	},

	tooltips: {
		checkPhone: [
			"Víš, že bys neměl",
			"Nepomůže to",
			"Zase?",
			"Algoritmus čeká",
			"Asi nic nového",
		],
		skip: [
			"Čas, který už nedostaneš zpět",
			"Odvážná strategie",
			"Nic se nestane",
			"Přeskočit je taky volba",
			"Možná později znamená nikdy",
		],
	},

	narrative: {
		good: [
			"Dneska to celkem klaplo, ne všechno, ale dost na to, aby to byl dobrej den.",
			"Docela dobrej den na to, jak to obvykle bývá, a nějaký momentum tam bylo.",
			"Víc věcí vyšlo než nevyšlo, a to se rozhodně počítá.",
			"Tlačítka dneska většinou spolupracovala, což je víc, než se dalo čekat.",
		],
		rough: [
			"Těžký den, tlačítka nechtěla fungovat, ale zítra je taky den.",
			"Dneska nic moc nevyšlo, což se stává a není to navždy.",
			"Jeden z těch dnů, kdy všechno bylo do kopce a klikání prostě neklikalo.",
			"Den, kdy se nic nepovedlo, ale spánek možná pomůže to resetovat.",
		],
		mixed: [
			"Něco se povedlo a něco ne, takovej normální den.",
			"Půl na půl, což mohlo dopadnout i hůř.",
			"Ani dobře ani špatně, prostě se stal další den.",
			"Nějaké výhry, nějaké prohry, celkově průměr.",
		],
	},

	allnighter: {
		wired: [
			"Energie je a mohlo by to být produktivní.",
			"Úplně vzhůru a noc je ještě mladá.",
			"Energie na rozdávání, tak proč ji plýtvat na spánek?",
		],
		someFuel: [
			"Ještě zbývá nějaká šťáva a možná to stojí za to.",
			"Ještě ne prázdno, dá se něco vymáčknout.",
			"V nádrži ještě něco je, tak proč ne.",
		],
		runningLow: [
			"Docházíš, ale ještě tam něco zbývá.",
			"Mizí to, ale ještě ne úplně, takže možná ještě jeden pokus.",
			"Nádrž je skoro prázdná, ale jen skoro.",
		],
		exhausted: [
			"Energie míň než v tom telefonu, co nikdy nenabíjíš, ale možná ještě jeden pokus.",
			"Na výparech a možná to není úplně dobrý nápad.",
			"Skoro nic nezbývá, ale skoro není úplně nic.",
		],
	},

	patterns: {
		title: "Tvoje vzorce",
		personality: "Osobnost",
		seed: "Seed",
		successRate: "Úspěšnost",
		bestTime: "Nejlepší čas",
		worstTime: "Nejhorší čas",
		phoneChecks: "Kontroly telefonu",
		allNighters: "Probdělé noci",
		friendRescues: "Záchrany od kamaráda",
		variantsUsed: "Vyzkoušené varianty",
		none: "Žádné",
		personalities: {
			nightOwl: "Noční sova",
			earlyBird: "Ranní ptáče",
			neutralTime: "Flexibilní",
			socialBattery: "Sociální baterie",
			hermit: "Poustevník",
			neutralSocial: "Vyrovnaný",
		},
	},

	dog: {
		walked: [
			"Azor se prošel a je spokojený.",
			"Procházka proběhla a pes je šťastný.",
			"Venčení hotovo, Azor má radost.",
		],
		failedAttempt: [
			"Venčení Azora bylo spíš jen stání venku, je zklamaný, ale chápe.",
			"Procházka se úplně nepovedla, ale Azor ví, že snaha tam byla.",
			"Venku to bylo krátký a moc to nebyla procházka, ale rozumí tomu.",
		],
		forcedMinimal: [
			"Minutka venku s Azorem, není to procházka, ale aspoň něco.",
			"Aspoň chvilka čerstvého vzduchu, Azor bere, co může dostat.",
			"Procházka to nebyla, ale vzduch byl a pes je trpělivý.",
		],
		urgency: {
			normal: [
				"Azor ještě dřímá",
				"Ocásek už vrtí",
				"Je připravený, až to půjde",
				"Ranní protahování",
			],
			waiting: ["Azor čeká", "Trpělivě vyčkává", "Ten pohled..."],
			urgent: [
				"Fakt potřebuje jít",
				"Začíná to bejt naléhavý",
				"Azor potřebuje ven",
			],
			critical: ["Už nemůže čekat", "Tohle je nouzovka", "Zoufalý"],
		},
	},

	hints: {
		// Personality hints - night owl
		nightOwlThriving: [
			"Ty ožíváš po setmění. Na tom není nic špatného.",
			"Večer ti to jde líp, ne? Jen tak říkám.",
			"Noční pták, co? To je v pořádku.",
			"V noci je to jiné. Víc to jde.",
		],
		nightOwlMorning: [
			"Rána nejsou tvoje, že? To je ok.",
			"Nejsi ranní ptáče. Přestaň s tím bojovat.",
			"Možná si schovej těžší věci na později? Jen nápad.",
		],
		// Personality hints - early bird
		earlyBirdThriving: [
			"Ráno ti to myslí nejlíp. Využij to.",
			"Ranní ptáče, že? Zvládni těžké věci brzo.",
			"Máš ranní energii. Neplýtvej jí na jednoduché věci.",
		],
		earlyBirdNight: [
			"Je pozdě. Možná to zabal na dnešek?",
			"Jedeš na výpary. Zítra je nový den.",
			"Takhle pozdě ti to už nepůjde. Běž spát.",
		],
		// Personality hints - social type
		hermitSocialCost: [
			"Vím, že tě tohle stojí energii. Díky, že to vyšlo.",
			"Chápu, že ti to něco bere. Vážím si, že to děláš.",
			"Potom budeš potřebovat čas o samotě. To je v pohodě.",
			"Díky, že to vyšlo. Není to samozřejmost.",
		],
		socialBatteryBoost: [
			"Vypadáš líp, když se vidíme. Měli bychom to dělat častěji.",
			"Vidíš? Tohle ti prospívá. Neizoluj se.",
			"Mezi lidmi ti to svítí. Pamatuj si to.",
			"Pomáhá ti to, že? Být s někým.",
		],
		// State hints
		creativeStruggling: [
			"Ta kreativní věc... možná nemusí být pokaždý celá?",
			"Co kdybys jen sáhl na ten nástroj? Jen ho chvíli držel?",
			"Velké kreativní projekty jsou těžké. Není to tvoje selhání.",
			"Možná máš laťku moc vysoko. Co je nejmenší verze?",
		],
		dogAnchor: [
			"Venčení pomáhá, že? Dostane tě do pohybu.",
			"Azor tě vytáhne z domu. To je důležité.",
			"Pes nesoudí. Je prostě rád, že jste spolu.",
			"Venčení psa... to je tvoje jistota. Spoléhej na to.",
		],
		lowEnergy: [
			"Vypadáš fakt vyčerpaně. Nic velkého dneska, ok?",
			"Dochází ti šťáva. Jen malé věci.",
			"Těžký den, co? To je ok. Stává se.",
			"Ne každý den je dobrý. Tohle je jeden z těch.",
		],
		highMomentum: [
			"Jde ti to. Jeď dál.",
			"Zrovna ti to klape. Nepřemýšlej nad tím.",
			"Dobrý tah. Udělej další věc, dokud to jde.",
		],
		hygieneStruggling: [
			"Ty tělesné věci... jsou těžké, když je těžké všechno ostatní.",
			"Zuby, sprcha, cokoliv. Zítra je další šance.",
			"Základní věci nejsou základní, když mozek nespolupracuje.",
		],
		generalStruggle: [
			"Takhle to někdy bývá. Přejde to.",
			"Nic teď nefunguje. To se stává.",
			"Těžké období. Není to tvoje chyba.",
		],
		// Fallback hints when nothing specific matches
		fallback: [
			"To bylo fajn. Vypadáš o něco líp.",
			"Rád tě vidím. Dávej na sebe pozor.",
			"Tohle pomohlo. Někdy to zopakujeme.",
			"Jde ti to. I když to tak necítíš.",
			"Jednu věc po druhé. Zvládneš to.",
		],
	},

	activities: {
		low: [
			{
				name: "Kafe",
				descriptions: [
					"Rychlé kafe, v klidu",
					"Nic složitýho, jen kafe",
					"Tam co vždycky",
				],
			},
			{
				name: "Bubble tea",
				descriptions: [
					"Něco sladkýho, nic velkýho",
					"Cukr pomáhá",
					"Mám na to chuť tak jako tak",
				],
			},
			{
				name: "Krátká procházka",
				descriptions: [
					"Jen kolem baráku",
					"Čerstvej vzduch, to je všechno",
					"Deset minut, max",
				],
			},
			{
				name: "Prostě být spolu",
				descriptions: [
					"Přijď, nemusíme nic dělat",
					"Prostě... buď tady",
					"Budu taky jen na mobilu, v pohodě",
				],
			},
		],
		medium: [
			{
				name: "Dát si jídlo",
				descriptions: [
					"Zajít někam na jídlo",
					"Stejně musíš jíst",
					"Platím, když přijdeš",
				],
			},
			{
				name: "Pizza někde",
				descriptions: [
					"Znám jedno místo",
					"Nic extra, jen pizza",
					"Sacharáty řeší problémy",
				],
			},
			{
				name: "Jít někam",
				descriptions: [
					"Chci ti ukázat jedno místo",
					"Není to daleko, slibuju",
					"Potřebuju kroky tak jako tak",
				],
			},
			{
				name: "Poflakovat se",
				descriptions: [
					"Bez plánu, jen jít",
					"Uvidíme, kam dojdeme",
					"Lepší než sedět",
				],
			},
		],
		high: [
			{
				name: "Prozkoumat něco",
				descriptions: [
					"Mrknout na to nové místo",
					"Může to bejt dobrý, může to bejt divný",
					"Pořád říkáme, že tam zajdem",
				],
			},
			{
				name: "Nová oblast",
				descriptions: [
					"Pojďme se pořádně ztratit",
					"Nikdo z nás tam nebyl",
					"Údajně dobrodružství",
				],
			},
			{
				name: "To místo co odkládáme",
				descriptions: [
					"To, co pořád říkáme že zkusíme",
					"Teď nebo nikdy",
					"Je to na seznamu už věčnost",
				],
			},
			{
				name: "Normální výlet",
				descriptions: [
					"Jako lidi co vychází z baráku",
					"Opravdu jít ven",
					"Plná expedice",
				],
			},
		],
	},

	friend: {
		// Cost labels for rescue screen
		costSlot: (n: number) => pl(n, "slot", "sloty", "slotů"),
		costPoints: (n: number) => pl(n, "bod", "body", "bodů"),

		// Phone buzz hints (2 consecutive failures, building anticipation)
		phoneBuzz: [
			"Telefon zavibruje. Nekoukáš.",
			"Notifikace. Ignoruješ ji.",
			"Displej se krátce rozsvítí.",
			"Něco zavibruje v kapse.",
			"Telefon vibruje na stole.",
			"Přišla zpráva. Koukneš později.",
			"Telefon zapípá. Teď ne.",
		],
		// Phone ignored (3+ failures but rescue doesn't trigger)
		phoneIgnored: [
			"Další vibrace. Necháváš to být.",
			"Zase telefon. Teď ne.",
			"Další vibrace. Jedno.",
			"Další notifikace. Máš práci s neúspěchy.",
			"Telefon to vzdal a ztichl.",
			"Ještě jedna vibrace. Víš, kdo to je.",
		],
		// Rescue messages (what the friend texts)
		rescueMessages: [
			"Hele, jsi v pohodě? Nechceš zajít na kafe?",
			"Jsem stejně u tebe poblíž. Rychlá procházka?",
			"Vypadáš dneska mimo. Bubble tea?",
			"Máš chvilku? Hodila by se mi společnost.",
			"Čau. Jsi k zastižení? Taky bych si dal pauzu.",
			"Kafe? Platím já.",
			"Co děláš? Nechtěl bys vypadnout ven?",
			"Nudím se. Zachraň mě z bytu?",
			"Seš nějak potichu. Všechno ok?",
			"Čau. Jen se hlásím. Nechceš se sejít?",
			"Našel jsem místo, co chci vyzkoušet. Půjdeš se mnou?",
			"Potřebuju záminku vylézt z domu. Jdeš do toho?",
		],
		// Result messages when activity tier matched energy level
		rescueResultCorrect: [
			"Správná volba. Je to trochu lepší.",
			"Tohle pomohlo. Bylo to potřeba.",
			"Líp. Ne v pořádku, ale líp.",
			"Je ti trochu lehčeji.",
			"Správná volba.",
		],
		// Result messages when activity tier was too high
		rescueResultIncorrect: [
			"Bylo to trochu víc, než bylo rozumné. Ale kamarád stál za to.",
			"Vzalo to víc energie, než se čekalo. Ale stálo to za to.",
			"Na dnešek možná trochu moc. Ale lepší než zůstat doma.",
			"Náročné. Ale ne zbytečné.",
		],
	},

	tasks: {
		shower: {
			name: "Sprcha",
			variant: {
				name: "Opláchnout obličej",
				unlockHints: [
					"Celá sprcha může počkat, ale aspoň si opláchnout obličej by šlo.",
					"Nemusíš do sprchy, stačí trocha vody. Taky se počítá.",
					"Co kdyby čistota nemusela znamenat celou sprchu?",
					"Sprcha dneska nebude, ale co takhle jen obličej?",
				],
			},
			evolution: {
				aware: [
					"Sprcha - už je to nějaký ten den",
					"Sprcha - ta voda je fakt blízko",
					"Sprcha - tělo začíná protestovat",
				],
				honest: [
					"Ta věc se sprchou",
					"Pokus o osobní hygienu",
					"Sprcha jako životní výzva",
				],
				resigned: [
					"Vztah ke sprše je v současnosti napjatý",
					"Sprchování patří mezi teoretické možnosti",
					"Jednou to zase půjde, jen ne teď",
				],
			},
		},
		"brush-teeth-morning": {
			name: "Vyčistit zuby",
			evolution: {
				aware: [
					"Vyčistit zuby - ranní dech je specifický",
					"Vyčistit zuby - ještě před kávou",
					"Vyčistit zuby - kartáček čeká",
				],
				honest: [
					"Ranní zubní hygiena",
					"Ty dvě minuty s kartáčkem",
					"Zuby, první kolo",
				],
				resigned: [
					"Kartáček tam leží a soudí tě",
					"Zubař by měl radost, kdyby věděl",
					"Ráno a zuby, věčný souboj",
				],
			},
		},
		"brush-teeth-evening": {
			name: "Vyčistit zuby",
			evolution: {
				aware: [
					"Vyčistit zuby - víš, že bys měl",
					"Vyčistit zuby - než půjdeš spát",
					"Vyčistit zuby - ten pocit viny",
				],
				honest: [
					"Večerní zubní rutina",
					"Zuby před spaním (ta těžší část)",
					"Zuby, druhé kolo",
				],
				resigned: [
					"Večerní čištění je pro lidi, co ještě nemají postel",
					"Zuby můžou počkat do rána, ne?",
					"Únava vs. zubní hygiena, známý souboj",
				],
			},
		},
		cook: {
			name: "Uvařit jídlo",
			variant: {
				name: "Ohřát něco v mikrovlnce",
				unlockHints: [
					"Vaření nemusí znamenat vaření, mikrovlnka se počítá.",
					"Co kdybys to s jídlem vzal jednodušeji? Mikrovlnka je taky jídlo.",
					"Velké vaření dneska nebude, ale něco jednoduchého by šlo.",
					"Nemusíš vařit doopravdy, stačí se najíst.",
				],
			},
			evolution: {
				aware: [
					"Uvařit jídlo - teoreticky to jde",
					"Uvařit jídlo - ingredience někde jsou",
					"Uvařit jídlo - viděls to v TV",
				],
				honest: ["Ta věc s vařením", "Kuchyňské ambice", "Pokus o teplé jídlo"],
				resigned: [
					"Vaření je pro lidi, co mají energii na vaření",
					"Spousta lidí taky nevaří a žijou",
					"V lednici je určitě něco, možná",
				],
			},
		},
		delivery: {
			name: "Objednat jídlo",
			evolution: {
				aware: [
					"Objednat jídlo - už zase",
					"Objednat jídlo - appka tě zná",
					"Objednat jídlo - taky je to jídlo",
				],
				honest: [
					"Jako obvykle",
					"Stravování přes appku",
					"Jídlo, outsourcovaně",
				],
				resigned: [
					"Kurýr už tě zdraví jménem",
					"Hlavně že se najíš, způsob je vedlejší",
					"Rozvoz je legitimní životní strategie",
				],
			},
		},
		dishes: {
			name: "Umýt nádobí",
			variant: {
				name: "Umýt jeden talíř",
				unlockHints: [
					"Jeden talíř stačí, víc nemusíš.",
					"Nemusíš umýt všechno, jeden kus je taky pokrok.",
					"Co kdyby nádobí znamenalo jeden talíř?",
					"Celý dřez nemusí být, jeden kousek je výhra.",
				],
			},
			evolution: {
				aware: [
					"Umýt nádobí - pořád tam je",
					"Umýt nádobí - hromada roste",
					"Umýt nádobí - nikam neodejde",
				],
				honest: [
					"Ta hromada v dřezu",
					"Nádobí chce pozornost",
					"Konfrontace s dřezem",
				],
				resigned: [
					"Ten dřez se sám neumyje, ale taky nikam neutíká",
					"Vidličky jsou přeceňované, dá se jíst i lžící",
					"Dřez má geologické vrstvy",
				],
			},
		},
		"walk-dog": {
			name: "Venčit psa",
			evolution: {
				aware: [
					"Venčit psa - čeká u dveří",
					"Venčit psa - ty jeho oči",
					"Venčit psa - vodítko visí na háčku",
				],
				honest: [
					"Azor potřebuje ven",
					"Venčení, bez diskuze",
					"Pes má svoje potřeby",
				],
				resigned: [
					"Azor chápe víc, než by měl",
					"Pes potřebuje ven a ty potřebuješ vstát",
					"Je trpělivější, než si zasloužíš",
				],
			},
		},
		work: {
			name: "Pracovní úkol",
			evolution: {
				aware: [
					"Pracovní úkol - sám nezmizí",
					"Pracovní úkol - deadline se blíží",
					"Pracovní úkol - platí tě za to",
				],
				honest: [
					"Ta pracovní věc",
					"Profesní povinnosti",
					"Něco pro zaměstnavatele",
				],
				resigned: [
					"Práce je pro lidi, co mají energii na práci",
					"Produktivita je zajímavý koncept",
					"Platí tě za to, tak asi jo",
				],
			},
		},
		"practice-music": {
			name: "Cvičit hudbu",
			evolution: {
				aware: [
					"Cvičit hudbu - vzpomínáš na hudbu?",
					"Cvičit hudbu - nástroj tě postrádá",
					"Cvičit hudbu - kdysi to šlo",
				],
				honest: ["Hudební ambice", "Sáhnout na nástroj", "Kreativní aspirace"],
				resigned: [
					"Nástroj sbírá prach, ale aspoň ho máš",
					"Hudba je pro lidi, co mají energii na hudbu",
					"Kdysi to šlo, možná zase půjde",
				],
			},
		},
		shopping: {
			name: "Jít nakoupit",
			evolution: {
				aware: [
					"Jít nakoupit - lednice je smutná",
					"Jít nakoupit - potřebuješ věci",
					"Jít nakoupit - seznam roste",
				],
				honest: [
					"Nákupní výprava",
					"Sehnat zásoby",
					"Opustit byt a získat jídlo",
				],
				resigned: [
					"V obchodě mají jídlo a ty potřebuješ jídlo",
					"Nakupování vyžaduje odejít z bytu, což je problém",
					"Lednice se sama nenaplní",
				],
			},
		},
		"social-event": {
			name: "Společenská akce",
			evolution: {
				aware: [
					"Společenská akce - lidi tě čekají",
					"Společenská akce - říkals, že přijdeš",
					"Společenská akce - zeptají se, jak se máš",
				],
				honest: [
					"Společenská povinnost",
					"Naplánovaná lidská interakce",
					"Být mezi lidmi",
				],
				resigned: [
					"Kamarádi jsou fajn, ale gauč je taky fajn",
					"Socializace zní fajn, dokud nepřijde",
					"Lidi jsou super, ale vstát je těžké",
				],
			},
		},
		"go-outside": {
			name: "Jít ven",
			evolution: {
				aware: [
					"Jít ven - čerstvý vzduch existuje",
					"Jít ven - slunce tam je",
					"Jít ven - tělo by to ocenilo",
				],
				honest: [
					"Opustit byt",
					"Zažít venkovní svět",
					"Dotknout se trávy, doslova",
				],
				resigned: [
					"Venku je hezky, ale dveře jsou daleko",
					"Vitamín D se sám nevyrobí",
					"Vzduch je venku lepší, ale vyžaduje odejít",
				],
			},
		},
	},
} satisfies Strings;
