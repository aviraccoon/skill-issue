import type { Day, TimeBlock } from "../state";
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
		nightPrompt: "Je pozdě. Mohl bys jít spát. Nebo...",
		sleep: "Spát",
		pushThrough: "Vydržet",

		// Friend rescue
		rescueCost: (cost: string) => `Setkání zabere ${cost}`,
		rescueDecline: "Teď ne",

		// Day summary
		taskStats: (succeeded: number, attempted: number) =>
			`${succeeded} z ${attempted} úkolů`,
		allNighterTitle: (day: Day, nextDay: Day | null) =>
			nextDay ? `${days[day]} / ${days[nextDay]}` : `${days[day]} (pozdě)`,
		allNighterNarrative: (day: Day, nextDay: Day | null) =>
			`${days[day]} přešlo do ${nextDay ? daysLower[nextDay] : "dalšího dne"}. Vydržel jsi. Nakonec jsi přestal.`,

		// Week complete
		weekComplete: "Týden dokončen",
		startNewWeek: "Začít nový týden",
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

	scrollTrap: [
		"Nic nového. Věděl jsi to.",
		"Algoritmus děkuje.",
		"...tak jo.",
		"O 30 minut později...",
		"Azor se na tebe podívá. Odvrátí pohled.",
		"Pes vzdychne. Nebo si to představuješ.",
		"Nic jsi nenašel. Jak se dalo čekat.",
		"Čas plyne. Nic se nemění.",
	],

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
		good: "Dneska to klaplo. Ne všechno, ale dost.",
		rough: "Těžký den. Tlačítka nechtěla fungovat. Zítra je taky den.",
		mixed: "Něco se povedlo. Něco ne. Takovej den.",
	},

	allnighter: {
		wired: "Jsi nabuzený. Mohlo by to být produktivní.",
		someFuel: "Ještě máš nějakou šťávu. Možná to stojí za to.",
		runningLow: "Docházíš, ale ještě něco zbývá.",
		exhausted: "Jsi vyčerpaný. Možná ještě jeden pokus.",
	},

	weekNarrative: {
		good: "Zvládl jsi to. Pes se venčil. Jedl jsi. Něco se povedlo, něco ne. Takovej týden.",
		rough:
			"Přežil jsi. Některé dny tak tak. Pes tě má pořád rád. Najedl ses, i když to byl samej rozvoz. Jsi tady.",
		survived:
			"Týden pokusů. Něco vyšlo. Většina ne. Měl jsi ten jeden moment, kdy to klaplo. Normální týden, vlastně.",
	},

	dog: {
		walked: "Azor se prošel. Je spokojený.",
		failedAttempt:
			"Pokusil ses venčit Azora. Stál jsi chvíli venku. Je zklamaný, ale chápe.",
		forcedMinimal:
			"Stál jsi minutku venku s Azorem. Není to procházka, ale je to aspoň něco. Dívá se na tebe.",
		urgency: {
			normal: "Normální",
			waiting: "Azor čeká",
			urgent: "Fakt potřebuje jít",
			critical: "Kritické - je zoufalý",
		},
	},

	hints: {
		// Personality hints - night owl
		nightOwlThriving: [
			"Ty ožíváš po setmění. Na tom není nic špatného.",
			"Všiml sis, že večer ti to jde líp? Jen tak říkám.",
			"Noční pták, co? To je v pořádku.",
			"V noci jsi jiný. Víc sám sebou.",
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
			"Vím, že tě tohle stojí energii. Díky, žes přišel.",
			"Chápu, že ti to něco bere. Vážím si, že to děláš.",
			"Potom budeš potřebovat čas o samotě. To je v pohodě.",
			"Díky, že jsi vyrazil. Vím, že to není nic.",
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
			"Pes nesoudí. Je prostě rád, že jsi přišel.",
			"Venčení psa... to je tvoje jistota. Spoléhej na to.",
		],
		lowEnergy: [
			"Vypadáš fakt vyčerpaně. Buď na sebe hodný.",
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
		low: {
			name: "Kafe",
			description: "Rychlé kafe, v klidu",
		},
		medium: {
			name: "Dát si jídlo",
			description: "Zajít někam na jídlo",
		},
		high: {
			name: "Prozkoumat něco",
			description: "Mrknout na to nové místo",
		},
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
			"Dobře jsi udělal. Cítíš se líp.",
			"Tohle pomohlo. Potřeboval jsi to.",
			"Líp. Ne v pořádku, ale líp.",
			"Je ti trochu lehčeji.",
			"Správná volba.",
		],
		// Result messages when activity tier was too high
		rescueResultIncorrect: [
			"Trochu ses přetáhl. Ale viděl jsi kamaráda.",
			"Vzalo ti to víc, než jsi čekal. Ale stálo to za to.",
			"Na dnešek trochu moc. Ale ukázal ses.",
			"Vyčerpávající. Ale zvládl jsi to.",
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
					"Cvičit hudbu - tohle jsi dělával rád",
				],
				honest: ["Hudební ambice", "Sáhnout na nástroj", "Kreativní aspirace"],
				resigned: [
					"Nástroj sbírá prach, ale aspoň ho máš",
					"Hudba je pro lidi, co mají energii na hudbu",
					"Jednou ses tomu věnoval, možná zase budeš",
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
					"Kamarády máš rád, ale gauč máš taky rád",
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
