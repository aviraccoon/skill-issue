import type { Day, TimeBlock } from "../state";
import { pickVariant } from "../utils/random";

/** Simple English plural: returns "1 slot" or "3 slots". */
const pl = (n: number, word: string) => `${n} ${n === 1 ? word : `${word}s`}`;

/** Day names for standalone display (headers, titles). */
const days: Record<Day, string> = {
	monday: "Monday",
	tuesday: "Tuesday",
	wednesday: "Wednesday",
	thursday: "Thursday",
	friday: "Friday",
	saturday: "Saturday",
	sunday: "Sunday",
};

/** Time block names for standalone display (headers). */
const timeBlocks: Record<TimeBlock, string> = {
	morning: "Morning",
	afternoon: "Afternoon",
	evening: "Evening",
	night: "Night",
};

/**
 * English strings - the source of truth for all translations.
 * Other language files must match this shape (enforced by Strings type).
 */
export const en = {
	days,
	timeBlocks,
	game: {
		// Task panel
		selectTask: "Select a task",
		attempt: "Attempt",
		done: "Done",
		failedCount: (n: number) => `Failed ${pl(n, "time")} this week`,
		costPoints: (n: number) => `${n} points`,

		// Time/slots
		slots: (n: number) => `${pl(n, "slot")} remaining`,
		points: (n: number) => pl(n, "point"),
		lateNight: "Late Night",

		// Actions
		checkPhone: "Check Phone",
		menu: "Menu",
		skipTo: (block: TimeBlock) => `Skip to ${timeBlocks[block]}`,
		endDay: "End day",
		continue: "Continue",
		continueTo: (block: TimeBlock) => `Continue to ${timeBlocks[block]}`,

		// Task name formatting (weekends)
		taskWithTime: (name: string, block: TimeBlock) =>
			`${name} (${timeBlocks[block]})`,
		taskWithCost: (name: string, cost: number) => `${name} [${cost}pt]`,

		// Night choice
		nightTitle: (day: Day) => `${days[day]} Night`,
		nightPrompt: [
			"It's late. You could sleep. Or...",
			"Sleep is an option. Theoretically.",
			"The responsible choice would be to sleep.",
			"You could stop. You probably won't.",
		],
		sleep: "Sleep",
		pushThrough: "Push Through",

		// Friend rescue
		rescueCost: (cost: string) => `Meeting up will use ${cost}`,
		rescueDecline: [
			"Not right now",
			"Can't today",
			"Maybe later",
			"I should, but...",
			"Another time?",
			"Sorry, not now",
		],

		// Day summary
		taskStats: (succeeded: number, attempted: number) =>
			`${succeeded} of ${attempted} tasks`,
		allNighterTitle: (day: Day, nextDay: Day | null) =>
			nextDay ? `${days[day]} / ${days[nextDay]}` : `${days[day]} (late)`,
		allNighterNarrative: (day: Day, nextDay: Day | null, seed: number) => {
			const next = nextDay ? days[nextDay] : "the next day";
			return pickVariant(
				[
					`${days[day]} bled into ${next}. You pushed through. At some point you stopped.`,
					`The night stretched. ${days[day]} became ${next}. You made it, somehow.`,
					`You didn't sleep. ${days[day]} turned into ${next}. It's blurry now.`,
					`One moment it was ${days[day]}, then it was ${next}. Time is fake anyway.`,
				],
				seed,
			);
		},

		// Week complete
		weekComplete: "Week Complete",
		startNewWeek: "Start New Week",
	},

	intro: {
		title: "Skill Issue",
		description: "Manage your week. Click tasks to do them. Good luck.",
		start: "Start",
	},

	splash: {
		title: "SKILL ISSUE",
		texts: [
			"Click to start (or don't)",
			"You'll get to it eventually",
			"The button works. Probably.",
			"No pressure",
			"Today's the day",
			"It's just one click",
			"You meant to start yesterday",
			"Starting is the hardest part",
			"The tasks aren't going anywhere",
			"Ready when you are",
			"One click. You can do one click.",
			"The week won't manage itself",
			"Good luck (you'll need it)",
			"Task 1: Click this button",
			"This counts as productivity",
			"You're already procrastinating",
		],
		startButtons: [
			"Click to start",
			"Start",
			"Fine, start",
			"Here goes nothing",
			"Might as well",
			"Get it over with",
			"Begin, I guess",
			"Let's see",
		],
	},

	menu: {
		continue: "Continue",
		continueSubtext: (day: string, time: string) => `${day}, ${time}`,
		newGame: "New Game",
		seedLabel: "Seed",
		seedPlaceholder: "Enter seed (optional)",
		startSeeded: "Start with Seed",
		seededRunNotice: (day: string, seed: number) =>
			`Seeded run in progress: ${day} (seed ${seed})`,
		settings: "Settings",
	},

	settings: {
		title: "Settings",
		close: "Close",
		theme: "Theme",
		language: "Language",
		accessibility: "Accessibility",
	},

	a11y: {
		// Screen announcements
		screenNightChoice: "Night time",
		screenFriendRescue: "Friend reaching out",
		screenDaySummary: "Day summary",
		screenWeekComplete: "Week complete",

		// Buttons
		openA11yDialog: "Accessibility",

		// Landmarks & navigation
		skipLink: "Skip to main content",
		mainGame: "Game",
		taskList: "Tasks",
		taskPanel: "Selected task",
		gameActions: "Actions",

		// Live announcements
		taskSucceeded: (name: string) => `${name} succeeded`,
		slotUsed: "Slot used",
		pointsUsed: (n: number) => `${pl(n, "point")} used`,
		screenChanged: (screen: string) => `${screen} screen`,
		timeBlockChanged: (block: TimeBlock) => `Now ${timeBlocks[block]}`,
		gameLoaded: (
			day: Day,
			block: TimeBlock,
			isWeekend: boolean,
			slotsOrPoints: number,
			selectedTaskName?: string,
		) => {
			const dayTime = isWeekend
				? days[day]
				: `${days[day]} ${timeBlocks[block]}`;
			const resources = isWeekend
				? pl(slotsOrPoints, "point")
				: `${pl(slotsOrPoints, "slot")} remaining`;
			const selected = selectedTaskName ? `${selectedTaskName} selected` : "";
			return `${[dayTime, resources, selected].filter(Boolean).join(". ")}.`;
		},

		// Task states
		selected: "selected",
		completedToday: "completed today",

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
				parts.push(`Failed ${pl(failureCount, "time")}`);
			}
			if (urgency) parts.push(urgency);
			parts.push(canAttempt ? "Attempt available" : "Done");
			if (variantName && canAttempt) parts.push(`Or: ${variantName}`);
			return `${parts.join(". ")}.`;
		},

		// Urgency (for Walk Dog)
		urgency: (level: string) => `Urgency: ${level}`,

		// Variant available
		variantAvailable: (name: string) => `Or try: ${name}.`,
	},

	a11yStatement: {
		title: "Accessibility",
		close: "Close",

		// Support section
		supportTitle: "Support",
		screenReaders: "Screen readers",
		screenReadersValue: "Supported",
		keyboard: "Keyboard navigation",
		keyboardValue: "Full",
		reducedMotion: "Reduced motion",
		reducedMotionValue: "Respected",

		// Controls section
		controlsTitle: "Controls",
		controlTab: "Navigate",
		controlUpDown: "Move between tasks",
		controlRightEnter: "Select task / open details",
		controlLeftEsc: "Deselect / close details",
		controlActivate: "Attempt task",
		controlEscape: "Close dialogs",

		// About section
		aboutTitle: "About this game",
		unreliableClicks: "Unreliable clicks",
		unreliableClicksValue: "Intentional - simulates executive dysfunction",
		silentFailures: "Silent failures",
		silentFailuresValue: "No announcement - absence of success is the signal",
		hiddenState: "Hidden energy/momentum",
		hiddenStateValue: "By design - discovering patterns is part of the game",

		// Contact
		contact: "Found a barrier? Let me know.",
	},

	phoneOutcomes: {
		void: [
			"Nothing new. You knew that.",
			"The algorithm thanks you.",
			"...anyway.",
			"Azor glances at you. Looks away.",
			"The dog sighs. Or you imagine he does.",
			"You found nothing. As expected.",
			"Time passes. Nothing changes.",
			"Scroll. Scroll. Scroll. Done.",
		],
		scrollHole: [
			"You blinked and an hour passed.",
			"The rabbit hole was deep today.",
			"Where did that time go?",
			"You got sucked in. Hard.",
			"That was worse than usual.",
			"The algorithm won this round.",
			"...anyway. What were you doing?",
		],
		actualBreak: [
			"Huh. That was actually kind of nice.",
			"A meme made you laugh. That counts.",
			"You saw something that made you smile.",
			"Brief respite. Back to it.",
			"A moment of genuine entertainment.",
			"You put it down. Okay.",
		],
		somethingNice: [
			"A friend posted something. You felt connected for a moment.",
			"Someone shared good news. It helped.",
			"You remembered people exist. That's something.",
			"A message notification. Someone's thinking of you.",
			"Something in your feed actually mattered.",
			"A moment of real human connection. Rare.",
		],
		usefulFind: [
			"Wait. That's actually useful.",
			"You stumbled onto something helpful.",
			"Accidentally productive scrolling?",
			"Huh. The algorithm delivered something real.",
			"A genuinely useful thing. Mark the calendar.",
			"Something clicked. An idea for making things easier.",
		],
	},

	tooltips: {
		checkPhone: [
			"You know you shouldn't",
			"It won't help",
			"Again?",
			"The algorithm awaits",
			"Nothing new, probably",
		],
		skip: [
			"Time you'll never get back",
			"Bold strategy",
			"Nothing will happen",
			"Skipping is also a choice",
			"Maybe later means never",
		],
	},

	narrative: {
		good: [
			"Things clicked today. Not everything, but enough.",
			"A good day, as these things go. Some momentum there.",
			"More successes than failures. That's something.",
			"The buttons cooperated today. Mostly.",
		],
		rough: [
			"A hard day. The buttons didn't want to work. Tomorrow exists.",
			"Nothing landed. That happens. It's not forever.",
			"The clicks weren't clicking. Sleep will help. Maybe.",
			"One of those days where everything felt uphill.",
		],
		mixed: [
			"Some things happened. Some didn't. That's a day.",
			"Half and half. Could be worse.",
			"Not great, not terrible. A day happened.",
			"Some wins, some losses. Average, really.",
		],
	},

	allnighter: {
		wired: [
			"You're wired. This could be productive.",
			"Wide awake. The night is young.",
			"Energy to burn. Why waste it on sleep?",
		],
		someFuel: [
			"You've got some fuel left. Might be worth it.",
			"Not empty yet. Could squeeze out a bit more.",
			"There's something in the tank still.",
		],
		runningLow: [
			"You're running low, but there's something there.",
			"Fading, but not gone. One more push?",
			"The tank's near empty. But not quite.",
		],
		exhausted: [
			"You're exhausted. One more attempt, maybe.",
			"Running on fumes. This might be a mistake.",
			"Almost nothing left. But almost isn't nothing.",
		],
	},

	patterns: {
		title: "Your Patterns",
		personality: "Personality",
		seed: "Seed",
		successRate: "Success Rate",
		bestTime: "Best Time",
		worstTime: "Worst Time",
		phoneChecks: "Phone Checks",
		allNighters: "All-Nighters",
		friendRescues: "Friend Rescues",
		variantsUsed: "Variants Tried",
		none: "None",
		personalities: {
			nightOwl: "Night Owl",
			earlyBird: "Early Bird",
			neutralTime: "Flexible",
			socialBattery: "Social Battery",
			hermit: "Hermit",
			neutralSocial: "Balanced",
		},
	},

	dog: {
		walked: [
			"Azor got his walk. He's happy.",
			"The dog is content. Outside happened.",
			"Walk complete. Tail wagging.",
		],
		failedAttempt: [
			"You tried to walk Azor. Stood outside briefly. He's disappointed but understands.",
			"The walk didn't quite happen. Azor knows you tried.",
			"Outside was brief. Not really a walk. He gets it.",
		],
		forcedMinimal: [
			"You stood outside with Azor for a minute. It's not a walk, but it's something. He looks at you.",
			"A minute of outside. Azor takes what he can get.",
			"Not a walk, but fresh air happened. He's patient.",
		],
		urgency: {
			normal: [
				"Azor's still sleepy",
				"Tail wagging already",
				"He's ready when you are",
				"Morning stretch mode",
			],
			waiting: ["Azor's been waiting", "He's been patient", "Those eyes"],
			urgent: ["He really needs to go", "Getting urgent", "Azor needs out"],
			critical: ["He can't wait anymore", "This is an emergency", "Desperate"],
		},
	},

	hints: {
		// Personality hints - night owl
		nightOwlThriving: [
			"You always come alive after dark. That's not a flaw.",
			"Hey, have you noticed you get more done late? Just something I've picked up.",
			"Night person, huh? Nothing wrong with that.",
			"You're different at night. More... you.",
		],
		nightOwlMorning: [
			"Mornings aren't your thing, are they? That's okay.",
			"You're not a morning person. Stop fighting it.",
			"Maybe save the hard stuff for later? Just a thought.",
		],
		// Personality hints - early bird
		earlyBirdThriving: [
			"You're always sharper in the morning. Use it.",
			"Morning person, right? Get the hard stuff done early.",
			"You've got that morning energy. Don't waste it on easy stuff.",
		],
		earlyBirdNight: [
			"It's late. Maybe call it a day?",
			"You're running on fumes. Tomorrow's a fresh start.",
			"Nothing good happens this late for you. Get some sleep.",
		],
		// Personality hints - social type
		hermitSocialCost: [
			"I know hanging out takes something out of you. Thanks for making time.",
			"I get that this costs you energy. Appreciate you doing it anyway.",
			"You need your alone time after this. That's fine.",
			"Thanks for coming out. I know it's not nothing for you.",
		],
		socialBatteryBoost: [
			"You seem better after we hang out. We should do this more.",
			"See? This is good for you. Don't isolate yourself.",
			"You light up when you're around people. Remember that.",
			"This helps you, doesn't it? Being around someone.",
		],
		// State hints
		creativeStruggling: [
			"That creative stuff... maybe it doesn't have to be the full thing every time?",
			"What if you just touched the instrument? Just held it for a minute?",
			"The big creative projects... they're hard. That's not you failing.",
			"Maybe the bar is too high on that one. What's the smallest version?",
		],
		dogAnchor: [
			"The dog walk helps, doesn't it? Gets you moving.",
			"Azor gets you out of the house. That matters.",
			"The dog doesn't judge. He's just happy you showed up.",
			"Walking the dog... that's your reliable one. Lean on it.",
		],
		lowEnergy: [
			"You seem really wiped. Be gentle with yourself.",
			"You're running low. Small stuff only.",
			"Today's rough, huh? That's okay. It happens.",
			"Not every day is a good day. This is one of those.",
		],
		highMomentum: [
			"You're on a bit of a roll. Ride it.",
			"Things are clicking right now. Don't overthink it.",
			"Good momentum. Do the next thing while you've got it.",
		],
		hygieneStruggling: [
			"The body stuff... it's hard when everything else is hard too.",
			"Teeth, shower, whatever. Tomorrow's another chance.",
			"Basic stuff isn't basic when your brain won't cooperate.",
		],
		generalStruggle: [
			"It's one of those stretches. They pass.",
			"Nothing's landing right now. That happens.",
			"Rough patch. Not your fault.",
		],
		// Fallback hints when nothing specific matches
		fallback: [
			"That was nice. You seem a bit better.",
			"Good to see you. Take care of yourself.",
			"This helped. Let's do it again sometime.",
			"You're doing okay. Even when it doesn't feel like it.",
			"One thing at a time. You've got this.",
		],
	},

	activities: {
		low: [
			{
				name: "Coffee",
				descriptions: [
					"Quick coffee, low pressure",
					"Just caffeine, nothing fancy",
					"The usual spot",
				],
			},
			{
				name: "Bubble tea",
				descriptions: [
					"Something sweet, nothing big",
					"Sugar helps",
					"I'm craving it anyway",
				],
			},
			{
				name: "Quick walk",
				descriptions: [
					"Just around the block",
					"Fresh air, that's it",
					"Ten minutes, tops",
				],
			},
			{
				name: "Exist nearby",
				descriptions: [
					"Come over, we don't have to do anything",
					"Just... be here",
					"I'll be on my phone too, it's fine",
				],
			},
		],
		medium: [
			{
				name: "Grab food",
				descriptions: [
					"Get something to eat together",
					"You need to eat anyway",
					"My treat if you show up",
				],
			},
			{
				name: "Pizza somewhere",
				descriptions: [
					"I know a place",
					"Nothing fancy, just pizza",
					"Carbs solve problems",
				],
			},
			{
				name: "Walk somewhere",
				descriptions: [
					"There's this spot I want to show you",
					"Not far, I promise",
					"I need the steps anyway",
				],
			},
			{
				name: "Wander around",
				descriptions: [
					"No plan, just moving",
					"See where we end up",
					"Better than sitting",
				],
			},
		],
		high: [
			{
				name: "Explore somewhere",
				descriptions: [
					"Check out that new place",
					"Could be good, could be weird",
					"We keep saying we'll go",
				],
			},
			{
				name: "New area",
				descriptions: [
					"Let's get properly lost",
					"I've never been either",
					"Adventure, allegedly",
				],
			},
			{
				name: "That place we mentioned",
				descriptions: [
					"The one we keep saying we'll try",
					"Now or never",
					"It's been on the list forever",
				],
			},
			{
				name: "Actual outing",
				descriptions: [
					"Like real people who leave the house",
					"Commit to being outside",
					"Full expedition mode",
				],
			},
		],
	},

	friend: {
		// Cost labels for rescue screen
		costSlot: (n: number) => `${pl(n, "action slot")}`,
		costPoints: (n: number) => `${pl(n, "action point")}`,

		// Phone buzz hints (2 consecutive failures, building anticipation)
		phoneBuzz: [
			"Your phone buzzes. You don't check it.",
			"A notification. You ignore it.",
			"Your phone lights up briefly.",
			"Something buzzes in your pocket.",
			"The phone vibrates against the table.",
			"A message comes in. You'll look later.",
			"Your phone chirps. Not now.",
		],
		// Phone ignored (3+ failures but rescue doesn't trigger)
		phoneIgnored: [
			"Another buzz. You let it go.",
			"The phone again. Not now.",
			"It buzzes again. Whatever.",
			"Another notification. You're busy failing.",
			"Your phone gives up and goes quiet.",
			"One more buzz. You know who it is.",
		],
		// Rescue messages (what the friend texts)
		rescueMessages: [
			"Hey, you doing okay? Want to grab coffee?",
			"I'm near your place anyway. Quick walk?",
			"You seem off today. Bubble tea?",
			"Free for a bit? Could use the company.",
			"Hey. You around? I could use a break too.",
			"Coffee? My treat.",
			"What are you up to? Feel like getting out?",
			"I'm bored. Save me from my apartment?",
			"You've been quiet. Everything okay?",
			"Hey. Just checking in. Want to hang?",
			"I found this place I want to try. Come with?",
			"Need an excuse to leave the house. You in?",
		],
		// Result messages when activity tier matched energy level
		rescueResultCorrect: [
			"That was good. You feel better.",
			"That helped. You needed that.",
			"Better. Not fixed, but better.",
			"You feel a bit lighter now.",
			"That was the right call.",
		],
		// Result messages when activity tier was too high
		rescueResultIncorrect: [
			"You pushed yourself a bit too much. Still, you saw your friend.",
			"That took more out of you than expected. Worth it, though.",
			"A little much for today. But you showed up.",
			"Exhausting. But you made it happen.",
		],
	},

	tasks: {
		shower: {
			name: "Shower",
			variant: {
				name: "Splash face with water",
				unlockHints: [
					"The full shower can wait. Water on face still counts.",
					"You don't have to do the whole shower thing. Splash some water. It's something.",
					"What if clean didn't have to mean shower? Face wash is still progress.",
					"Shower's not happening today. What about just... water? Face? Quick?",
				],
			},
			evolution: {
				aware: [
					"Shower - It's been a while",
					"Shower - The water's right there",
					"Shower - Your body has opinions",
				],
				honest: [
					"The Shower Situation",
					"Attempt Personal Hygiene",
					"Water + You (Ambitious)",
				],
				resigned: [
					"Standing under water is technically possible",
					"The shower exists. You exist. Separately.",
					"Cleanliness is next to... what was it?",
				],
			},
		},
		"brush-teeth-morning": {
			name: "Brush Teeth",
			evolution: {
				aware: [
					"Brush Teeth - Morning mouth",
					"Brush Teeth - Before coffee hits",
					"Brush Teeth - The mint awaits",
				],
				honest: [
					"The Morning Teeth Attempt",
					"Oral Hygiene (Morning Edition)",
					"Two Minutes of Brushing (Allegedly)",
				],
				resigned: [
					"Teeth. Morning. Theoretically compatible concepts.",
					"The toothbrush isn't going to use itself. Sadly.",
					"Dentists recommend. You... consider.",
				],
			},
		},
		"brush-teeth-evening": {
			name: "Brush Teeth",
			evolution: {
				aware: [
					"Brush Teeth - You know you should",
					"Brush Teeth - Before bed, ideally",
					"Brush Teeth - The guilt increases",
				],
				honest: [
					"The Evening Teeth Thing",
					"Night Brushing (The Hard One)",
					"Teeth Round Two",
				],
				resigned: [
					"Those teeth aren't brushing themselves. Well. They're not.",
					"The evening brush: where good intentions go to sleep.",
					"Bed soon. Teeth still unbrushed. Classic.",
				],
			},
		},
		cook: {
			name: "Cook Meal",
			variant: {
				name: "Microwave something",
				unlockHints: [
					"Cooking doesn't have to mean cooking. Microwave counts.",
					"What if you made food... easier? Microwave still counts as feeding yourself.",
					"The full cooking thing isn't happening. What about something simpler?",
					"You don't have to cook cook. Microwave is still eating.",
				],
			},
			evolution: {
				aware: [
					"Cook Meal - Theoretically possible",
					"Cook Meal - The ingredients are there",
					"Cook Meal - Like on TV but worse",
				],
				honest: [
					"Attempt Cooking (lol)",
					"The Cooking Aspiration",
					"Kitchen Time (Optimistic)",
				],
				resigned: [
					"The Cooking Delusion",
					"You own a stove. It owns you.",
					"Recipes exist. Motivation doesn't.",
				],
			},
		},
		delivery: {
			name: "Order Delivery",
			evolution: {
				aware: [
					"Order Delivery - Again",
					"Order Delivery - The app knows your order",
					"Order Delivery - Self-care, technically",
				],
				honest: [
					"The Usual",
					"Feed Yourself (Outsourced)",
					"Nutrition Via App",
				],
				resigned: [
					"Feed yourself (the realistic version)",
					"The delivery guy knows your name now.",
					"Eating counts. Method optional.",
				],
			},
		},
		dishes: {
			name: "Do Dishes",
			variant: {
				name: "Wash one dish",
				unlockHints: [
					"One dish. Just one. That's enough.",
					"You don't have to do all the dishes. One is still progress.",
					"What if dishes meant one dish? That counts.",
					"The whole sink doesn't have to happen. One dish is a win.",
				],
			},
			evolution: {
				aware: [
					"Do Dishes - They're still there",
					"Do Dishes - The pile grows",
					"Do Dishes - They're not going anywhere",
				],
				honest: ["The Dish Pile", "Sink Archaeology", "Confront The Dishes"],
				resigned: [
					"Dishes don't do themselves. Confirmed.",
					"The sink has layers now. Like sediment.",
					"You will run out of forks eventually.",
				],
			},
		},
		"walk-dog": {
			name: "Walk Dog",
			evolution: {
				aware: [
					"Walk Dog - He's waiting",
					"Walk Dog - Those eyes",
					"Walk Dog - The leash is right there",
				],
				honest: [
					"Azor Needs Out",
					"The Dog Walk (Non-Negotiable)",
					"Dog Has Needs",
				],
				resigned: [
					"The dog has needs. You have... intentions.",
					"He's been patient. More patient than you deserve.",
					"Outside exists. The dog knows this.",
				],
			},
		},
		work: {
			name: "Work Task",
			evolution: {
				aware: [
					"Work Task - It's not going away",
					"Work Task - The deadline approaches",
					"Work Task - They're paying you for this",
				],
				honest: [
					"The Work Thing",
					"Professional Obligations",
					"Employment Activities",
				],
				resigned: [
					"Productivity. A concept.",
					"Work exists. You exist near it. Sometimes.",
					"Capitalism requires participation. Unfortunately.",
				],
			},
		},
		"practice-music": {
			name: "Practice Music",
			evolution: {
				aware: [
					"Practice Music - Remember music?",
					"Practice Music - The instrument misses you",
					"Practice Music - You used to do this",
				],
				honest: [
					"The Music Fantasy",
					"Creative Aspirations (Musical)",
					"Touch An Instrument",
				],
				resigned: [
					"You own instruments. They exist. Somewhere.",
					"Music: a thing you theoretically do.",
					"The guitar collects dust. The dust is impressive.",
				],
			},
		},
		shopping: {
			name: "Go Shopping",
			evolution: {
				aware: [
					"Go Shopping - The fridge is empty",
					"Go Shopping - You need things",
					"Go Shopping - The list grows",
				],
				honest: [
					"The Shopping Expedition",
					"Acquire Provisions",
					"Leave House, Obtain Items",
				],
				resigned: [
					"Stores have things. You need things. Math.",
					"The outside world has groceries. Allegedly.",
					"Commerce requires leaving. A flaw in the system.",
				],
			},
		},
		"social-event": {
			name: "Social Event",
			evolution: {
				aware: [
					"Social Event - People expect you",
					"Social Event - You said you'd go",
					"Social Event - They'll ask if you're okay",
				],
				honest: [
					"The Social Obligation",
					"Human Interaction (Scheduled)",
					"Be Around People",
				],
				resigned: [
					"Other humans. In person. On purpose.",
					"Socializing: the thing you wanted until it arrived.",
					"You like your friends. You also like your couch.",
				],
			},
		},
		"go-outside": {
			name: "Go Outside",
			evolution: {
				aware: [
					"Go Outside - Fresh air exists",
					"Go Outside - The sun is out there",
					"Go Outside - Your body needs it",
				],
				honest: [
					"Leave The Building",
					"Experience Outdoors",
					"Touch Grass (Literally)",
				],
				resigned: [
					"Outside exists. You could be there. Theoretically.",
					"The door is right there. It's not that far.",
					"Vitamin D won't synthesize itself.",
				],
			},
		},
	},
} as const;
