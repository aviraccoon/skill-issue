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
		attempting: "Attempting...",
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
		screenNarrativeEvent: "Something happened",

		// Buttons
		openA11yDialog: "Accessibility",

		// Landmarks & navigation
		skipLink: "Skip to main content",
		mainGame: "Game",
		taskList: "Tasks",
		taskPanel: "Selected task",
		gameActions: "Actions",
		gameArea: "Room view showing your character",

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
		runsCompleted: "Runs",
		tasks: "Tasks",
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
		back: "Back",
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
		"go-out-to-eat": {
			name: "Go Out To Eat",
			evolution: {
				aware: [
					"Go Out To Eat - Food exists elsewhere",
					"Go Out To Eat - The restaurant's still there",
					"Go Out To Eat - You deserve a meal out",
				],
				honest: [
					"Leave House For Food",
					"Restaurant Ambitions",
					"Eat Among Strangers",
				],
				resigned: [
					"Food that someone else cooks AND serves? Revolutionary.",
					"Going out implies going. Therein lies the problem.",
					"The restaurant can't deliver itself. Wait. Actually...",
				],
			},
		},
		"make-coffee": {
			name: "Make Coffee",
			evolution: {
				aware: [
					"Make Coffee - The kettle's right there",
					"Make Coffee - Caffeine would help",
					"Make Coffee - You're thinking about it",
				],
				honest: [
					"Caffeine Acquisition",
					"The Coffee Ritual",
					"Boil Water, Add Bean Juice",
				],
				resigned: [
					"The kettle is three steps away. Might as well be Mars.",
					"Coffee: the thing between you and functionality.",
					"You've been thinking about making coffee for an hour now.",
				],
			},
		},
		laundry: {
			name: "Do Laundry",
			variant: {
				name: "Just put in a load",
				unlockHints: [
					"You don't have to do the whole laundry thing. Just put stuff in the machine.",
					"Throwing clothes in a machine is still laundry. You don't have to fold.",
					"What if laundry just meant loading the machine? Folding is future you's problem.",
					"One load. In the machine. That's it. The rest can wait.",
				],
			},
			evolution: {
				aware: [
					"Do Laundry - The pile is growing",
					"Do Laundry - Running out of socks",
					"Do Laundry - It's becoming a situation",
				],
				honest: [
					"The Laundry Mountain",
					"Clothing Situation Management",
					"Wrestle With Textiles",
				],
				resigned: [
					"The laundry pile has its own zip code now.",
					"You've been wearing that shirt for... nevermind.",
					"Clean clothes: an aspiration wrapped in dirty fabric.",
				],
			},
		},
		"take-out-trash": {
			name: "Take Out Trash",
			evolution: {
				aware: [
					"Take Out Trash - It's getting full",
					"Take Out Trash - The bag is straining",
					"Take Out Trash - Before it becomes a problem",
				],
				honest: [
					"The Trash Situation",
					"Bag Disposal (Simple In Theory)",
					"Walk To Bin And Back",
				],
				resigned: [
					"The trash isn't heavy. Getting up is.",
					"It's literally a walk to the bin. Why is this hard.",
					"The bag's been tied shut for two days. Progress, technically.",
				],
			},
		},
		"tidy-up": {
			name: "Tidy Up",
			variant: {
				name: "Clear one surface",
				unlockHints: [
					"One surface. Just one. The rest can stay chaotic.",
					"What if tidy meant one table? One counter? That's enough.",
					"Pick one surface. Clear it. Done. That's tidying.",
					"The whole apartment doesn't need to happen. One surface counts.",
				],
			},
			evolution: {
				aware: [
					"Tidy Up - Entropy is winning",
					"Tidy Up - The surfaces are disappearing",
					"Tidy Up - It's not that bad (it is)",
				],
				honest: [
					"Fight Entropy",
					"Surface Recovery Mission",
					"Impose Order (Briefly)",
				],
				resigned: [
					"The apartment has a vibe now. It's called chaos.",
					"Tidying implies a before and after. Both look the same.",
					"You know where everything is. It's on the floor.",
				],
			},
		},
		"feed-dog": {
			name: "Feed Dog",
			evolution: {
				aware: [
					"Feed Dog - He's watching you eat",
					"Feed Dog - The bowl is empty",
					"Feed Dog - Those eyes again",
				],
				honest: [
					"Fill The Dog Bowl",
					"Azor Requires Sustenance",
					"The Dog Needs Food (Obvious)",
				],
				resigned: [
					"He's staring at the bowl. Then at you. Then the bowl.",
					"Even the dog eats more regularly than you.",
					"His bowl, your guilt. A simple equation.",
				],
			},
		},
		"play-with-dog": {
			name: "Play With Dog",
			evolution: {
				aware: [
					"Play With Dog - He brought his toy",
					"Play With Dog - The tail's going",
					"Play With Dog - He's been waiting",
				],
				honest: [
					"Dog Entertainment",
					"Throw Thing, Dog Retrieves",
					"Active Dog Engagement",
				],
				resigned: [
					"He's been nudging the ball at you for twenty minutes.",
					"The toy is at your feet. Again. The hope is relentless.",
					"Fetch: a game that requires standing. Bold ask.",
				],
			},
		},
		"chill-with-dog": {
			name: "Chill With Dog",
			evolution: {
				aware: [
					"Chill With Dog - He's right there",
					"Chill With Dog - Mutual relaxation",
					"Chill With Dog - The couch awaits",
				],
				honest: [
					"Couch Time With Azor",
					"Exist Near The Dog",
					"Passive Dog Comfort",
				],
				resigned: [
					"The dog is warm. The couch is soft. You're almost there.",
					"Just... be with the dog. That's allowed.",
					"Lying on the couch with Azor counts as something. Probably.",
				],
			},
		},
		"draw-sketch": {
			name: "Draw/Sketch",
			evolution: {
				aware: [
					"Draw/Sketch - The sketchbook's dusty",
					"Draw/Sketch - You used to doodle",
					"Draw/Sketch - A blank page waits",
				],
				honest: [
					"The Drawing Fantasy",
					"Creative Marks On Paper",
					"Art Attempt",
				],
				resigned: [
					"Pencils exist. Paper exists. Art doesn't follow.",
					"The blank page and your blank mind. A matching set.",
					"Drawing: the thing you used to do before you stopped.",
				],
			},
		},
		write: {
			name: "Write",
			evolution: {
				aware: [
					"Write - The cursor blinks",
					"Write - Words exist somewhere",
					"Write - You have things to say",
				],
				honest: [
					"The Writing Attempt",
					"Words On Screen (Aspirational)",
					"Put Thoughts Somewhere",
				],
				resigned: [
					"The blank document judges silently.",
					"Writing requires thinking. Thinking requires... something.",
					"You have ideas. They're in there. Somewhere. Probably.",
				],
			},
		},
		exercise: {
			name: "Exercise",
			evolution: {
				aware: [
					"Exercise - Your body remembers movement",
					"Exercise - The shoes are by the door",
					"Exercise - It would feel good after",
				],
				honest: [
					"Move Your Body",
					"Physical Exertion (Voluntary)",
					"The Exercise Concept",
				],
				resigned: [
					"Your body is a temple. A neglected one.",
					"Exercise: the plan that dies between intention and action.",
					"You own workout clothes. They're very comfortable loungewear.",
				],
			},
		},
		"meet-friend": {
			name: "Meet Friend",
			evolution: {
				aware: [
					"Meet Friend - You keep meaning to",
					"Meet Friend - They texted yesterday",
					"Meet Friend - It's been a while",
				],
				honest: [
					"Initiate Social Contact",
					"Reach Out To A Human",
					"The Meeting Intention",
				],
				resigned: [
					"You want to see them. You also want to not leave.",
					"Friendship requires maintenance. Maintenance requires leaving.",
					"They're free. You're... available? You're available.",
				],
			},
		},
		"text-someone": {
			name: "Text Someone",
			evolution: {
				aware: [
					"Text Someone - It's just a message",
					"Text Someone - They won't bite",
					"Text Someone - Your phone's right there",
				],
				honest: [
					"Send A Text (Any Text)",
					"Type Words To A Human",
					"Digital Social Interaction",
				],
				resigned: [
					"One message. That's all. Type it. Send it. Done.",
					"The keyboard is right there. The anxiety is also right there.",
					"People text each other. Normal behavior. You can do normal.",
				],
			},
		},
		"take-meds": {
			name: "Take Meds",
			evolution: {
				aware: [
					"Take Meds - The pill box is right there",
					"Take Meds - You'll feel it if you skip",
					"Take Meds - Part of the routine",
				],
				honest: [
					"The Meds Situation",
					"Pill Consumption",
					"Ingest Prescribed Chemicals",
				],
				resigned: [
					"The pills don't take themselves. Unfortunately.",
					"Chemistry keeps you functional. Take the chemistry.",
					"Open bottle. Remove pill. Swallow. Why is this hard.",
				],
			},
		},
		read: {
			name: "Read",
			evolution: {
				aware: [
					"Read - The book is on the nightstand",
					"Read - You used to love this",
					"Read - One chapter. That's the plan.",
				],
				honest: [
					"Stare At Words",
					"The Reading Intention",
					"Book Time (Ambitious)",
				],
				resigned: [
					"Books: entertainment that requires sustained attention. Bold.",
					"You've been on page 47 for three weeks.",
					"The bookmark hasn't moved. It's become furniture.",
				],
			},
		},
		meditate: {
			name: "Meditate",
			evolution: {
				aware: [
					"Meditate - Five minutes would help",
					"Meditate - Everyone says it helps",
					"Meditate - Just sit. That's it.",
				],
				honest: [
					"Sit Still (Deliberately)",
					"The Meditation Attempt",
					"Organized Breathing",
				],
				resigned: [
					"Clear your mind. Step one: have a mind that clears.",
					"Meditation: sitting still but with intention. The intention is the hard part.",
					"Breathe in. Think about breathing. Think about thinking. Fail at meditating.",
				],
			},
		},
	},

	events: {
		// Tier 0: Flavor
		rain: {
			notification: [
				"It started raining. The window's streaked and the light went gray.",
				"Rain against the window. Rhythmic, almost nice. You could sit here and listen to it. You were going to sit here anyway.",
				"Gray outside. The rain doesn't care about your plans either.",
			],
			phoneFragment: [
				"Your weather app says rain. You could have just looked out the window.",
				"Someone posted a rainy window photo. You have the same view. You learned about it here.",
			],
		},
		"neighbors-music": {
			notification: [
				"Music through the wall. Someone's having a better evening.",
				"The neighbor's playlist leaked through again. You can almost make out the words.",
				"Muffled bass from next door. They're living their life over there.",
			],
			phoneFragment: [
				"Someone in the building chat complaining about the bass. At least it's not just you.",
				"You Shazam'd it through the wall. Now the algorithm thinks you like this genre.",
			],
		},
		"nice-weather": {
			notification: [
				"It's actually nice outside today. The kind of nice that makes staying in feel deliberate.",
				"Sun's out. Good weather for people who go outside.",
				"The kind of day people post about. You noticed from the window, which counts for something.",
			],
			phoneFragment: [
				"Everyone's posting park photos. The window is right there.",
				"Weather app: sunny, warm. You're reading this indoors.",
			],
		},
		"morning-bird": {
			notification: [
				"A bird outside the window. Aggressively cheerful for this hour.",
				"Bird singing at the window. Bold of nature to assume the mood is right.",
				"The bird is back. Same spot, same song, same time. At least someone's consistent.",
			],
		},
		"car-alarm": {
			notification: [
				"A car alarm outside. It'll stop eventually. Everything does.",
				"Car alarm going off. Someone's car is having a worse day than you. Probably.",
				"The car alarm stopped. You hadn't noticed it was still going. You'd adapted to it, apparently.",
			],
			phoneFragment: [
				"Neighborhood chat: 'whose car is that??' Three angry reacts.",
				"Someone posted about the car alarm. The comments are doing more than anyone outside.",
			],
		},
		sunset: {
			notification: [
				"The sky's doing something. Orange and pink, and you almost missed it.",
				"Nice sunset. You caught it from the window. Didn't plan to, but there it was.",
				"The light changed. For a moment everything looked warm, even your apartment.",
			],
			phoneFragment: [
				"Someone posted a sunset photo. It's happening right outside your window.",
				"Your camera roll has zero sunset photos. Someone else's has today's.",
			],
		},
		"hallway-noise": {
			notification: [
				"Something happening in the hallway. Doesn't concern you.",
				"Voices in the hallway. Someone's coming home. Someone's leaving. Normal building things.",
				"The hallway is busy today. People going places, doing things. The usual.",
			],
		},
		wind: {
			notification: [
				"The wind picked up. You can hear it finding every gap in the window frame.",
				"Windy tonight. The apartment creaks. It feels smaller when it's loud outside.",
				"Wind howling outside. Cozy in here. Relatively speaking.",
			],
		},

		// Tier 1: Standalone
		"cold-apartment": {
			notification: [
				"The apartment's cold. The heating is having some kind of existential crisis about its purpose in life.",
				"Cold in here. The radiator's doing its best impression of a slightly cold radiator. You'd adjust it, but that would involve getting up.",
				"You can almost see your breath. Almost. The heating's technically on. It's just not very committed to the concept.",
			],
			recap: [
				"The apartment was cold all week. The heating had opinions about working.",
				"It was cold enough to notice. You adapted, another layer, another small acceptance.",
			],
			phoneFragment: [
				"A thread about tenant heating rights. Bookmarked. Won't read it.",
				"Someone's apartment is also cold. Solidarity through screens.",
			],
		},
		"surprise-package": {
			notification: [
				"A package arrived. You ordered it... when? Doesn't matter. Opening it felt like a tiny accomplishment. You'll take those where you can get them.",
				"Package at the door. Past you bought present you something. That's thoughtful. Past you didn't leave a note about what it was, which is less thoughtful.",
				"Something you forgot you ordered showed up. It's like a gift from a version of yourself that had plans.",
			],
			recap: [
				"A package showed up from past-you. A small kindness from someone who still had plans.",
				"That surprise delivery was a bright spot. Past-you was looking out for present-you.",
			],
		},
		"hot-water-out": {
			notification: [
				"No hot water this morning. The shower barrier just got one notch higher. Not that it was exactly low before.",
				"Hot water's out. Cold shower or no shower. The universe narrowing your options, as if you needed help with that.",
				"The boiler gave up. Solidarity, honestly. Not everyone can perform on command.",
			],
			recap: [
				"The hot water died. Cold showers or no showers -- the universe narrowing your options.",
				"No hot water meant the shower barrier got higher. As if it needed help.",
			],
			phoneFragment: [
				"Building maintenance posted: 'working on it.' Two hours ago.",
				"You googled 'cold shower benefits.' The results were unconvincing.",
			],
		},
		"upstairs-party": {
			notification: [
				"Bass from upstairs. Someone's celebrating something. Down here, surviving is more the vibe.",
				"Party upstairs. The ceiling is vibrating with someone else's good time. Your patience is not vibrating with anything.",
				"It's loud upstairs. Someone's having the night you planned to have. At some point. In theory.",
			],
			recap: [
				"Someone upstairs had a party. Different floor, different reality. You survived it from below.",
				"The upstairs party was loud. Your patience was not.",
			],
			phoneFragment: [
				"Building chat: 'is anyone else hearing this??' Three people liked it.",
				"You almost posted about the noise. Almost. Complaining requires energy too.",
			],
		},
		"found-cash": {
			notification: [
				"Found money in your jacket pocket. Past you was weirdly thoughtful. Like leaving a tip for future you.",
				"A crumpled bill in yesterday's pants. The only nice surprise today. You'll take it.",
				"Money in the coat pocket. You don't remember putting it there. Small victories from a stranger who happens to be you.",
			],
			recap: [
				"Found money in a jacket pocket. A tip from past-you to present-you. Small victories.",
				"Cash appeared in your pocket. The kind of surprise that doesn't require leaving the apartment.",
			],
		},
		"good-smell": {
			notification: [
				"Something smells incredible from next door. Someone's actually cooking. With ingredients and everything.",
				"The neighbor's cooking smells so good it's almost aggressive. Your delivery app is right there, glowing on the counter.",
				"Food smell drifting through the wall. Your kitchen is right there too. With pots and everything. Theoretically available.",
			],
		},
		"neighbor-cookies": {
			title: "A Knock at the Door",
			description:
				"Your neighbor is standing there holding a plate of cookies. Homemade, from the smell of it. They're smiling. You're in yesterday's clothes and you haven't spoken to another human since... when? But cookies.",
			choices: {
				accept: {
					label: "Take the cookies",
					description:
						"They smell incredible. Also, free food you didn't have to make.",
				},
				decline: {
					label: "Politely decline",
					description:
						"That would require a conversation. Right now. At the door.",
				},
			},
			recap: {
				accept: [
					"Your neighbor brought cookies. You took them. The brief conversation at the door was more human contact than the rest of the week combined.",
					"The cookies were good. Homemade, warm. The human connection was probably better.",
				],
				decline: [
					"Your neighbor offered cookies. You said no. The smell lingered in the hallway.",
					"Cookies were offered and declined. Sometimes even free kindness costs too much energy.",
				],
			},
		},

		// Tier 1: Arc - The Leak
		"leak-drip": {
			notification: [
				"There's a dripping sound. Somewhere in the apartment. You can't quite place it, and honestly, you're not trying that hard.",
				"Drip. Drip. Drip. It's coming from... the kitchen? Maybe. You could investigate. Or you could not.",
				"A rhythmic dripping joined the background noise. You'll deal with it. Eventually. Probably.",
			],
			phoneFragment: [
				"A DIY plumbing video in your feed. The algorithm knows.",
				"You almost googled 'dripping sound apartment.' Almost.",
			],
		},
		"leak-found": {
			title: "The Source",
			description:
				"You found the dripping. Under the kitchen sink, a pipe fitting is weeping steadily onto the cabinet floor. There's already a dark stain spreading in the wood. It's not catastrophic yet. A towel would buy time. Making a phone call would fix it. Both require doing something.",
			choices: {
				call: {
					label: "Call maintenance",
					description:
						"Pick up the phone. Explain the problem. Schedule a time. Like a person who handles things.",
				},
				towel: {
					label: "Towel and forget",
					description:
						"A towel, some strategic denial, and the quiet hope that problems solve themselves.",
				},
			},
		},
		"leak-fixed": {
			notification: [
				"Maintenance came and fixed it. Twenty minutes. The whole ordeal took less effort than the week of not calling.",
				"Leak's fixed. Twenty minutes of someone else's competence. Why was picking up the phone the hardest part?",
			],
			recap: [
				"The leak got fixed. Twenty minutes of someone else's competence. The hardest part was picking up the phone.",
				"You called about the leak and someone came. Why was the phone call the obstacle, not the actual pipe?",
			],
		},
		"leak-worse": {
			notification: [
				"The towel is soaked through. The dripping sounds louder now, or maybe you're just more aware of it. This is becoming a situation.",
				"The leak is worse. The towel solution has quietly reached its theoretical limits. Tomorrow. Definitely tomorrow.",
			],
			recap: [
				"The leak got worse. The towel strategy reached its theoretical limits. Some problems don't solve themselves.",
				"That dripping under the sink? Still going. Louder now. The towel is doing its best.",
			],
			phoneFragment: [
				"You keep almost googling plumbers. The search bar remembers your hesitation.",
				"A home repair thread. The comments all say 'call someone.' Noted.",
			],
		},

		// Tier 1: Arc - Missed Delivery
		"missed-delivery": {
			notification: [
				"Note on the door. Missed a package delivery. You were here the whole time. You heard the knock and everything.",
				"Delivery attempt: failed. You were home. The door is eight steps away. You counted once.",
			],
			phoneFragment: [
				"Tracking update: 'Delivery attempted.' You know.",
				"The delivery notification is still there. Unread, technically. You just didn't open the door.",
			],
		},
		"delivery-deadline": {
			title: "Last Chance",
			description:
				"The pickup slip says today's the last day before they send it back. The post office closes at five. It's a fifteen-minute walk. The package is just sitting there, waiting. Like everything else on your list.",
			choices: {
				go: {
					label: "Go get it",
					description:
						"Leave the apartment. On purpose. Walk there and back. It's not nothing.",
				},
				"let-go": {
					label: "Let it go",
					description:
						"It'll get sent back. You'll reorder it eventually. Or you won't need it. Maybe.",
				},
			},
			recap: {
				go: [
					"You went out and got the package. Fifteen-minute walk, round trip. The hardest part was the door.",
					"The package was retrieved. You left the apartment on purpose, walked there and back. That counts.",
				],
				"let-go": [
					"The package went back. You'll reorder it. Probably. It already feels like it never existed.",
					"You let the delivery deadline pass. Another thing that almost happened.",
				],
			},
		},

		// Tier 1: Arc - Construction
		"construction-start": {
			notification: [
				"Construction started on the building next door. Jackhammers, drills, shouting. It's going to be a loud week.",
				"Jackhammers at eight AM. The city's version of an alarm clock. No snooze button.",
			],
			phoneFragment: [
				"Noise complaint thread in the neighborhood group. Everyone's suffering together, online.",
				"Someone posted a photo of the construction. It looks worse from the outside.",
			],
		},
		"construction-weekend": {
			notification: [
				"The construction stopped for the weekend. The silence is almost unsettling. You adapted to the racket faster than you'd like to admit.",
				"No jackhammers today. Saturday quiet. The absence of noise feels louder than the noise did. You'd gotten used to it without noticing.",
			],
			recap: [
				"The construction noise stopped for the weekend. You'd adapted without noticing. The silence felt wrong.",
				"Weekend quiet after a week of jackhammers. You adjusted to chaos faster than you'd admit.",
			],
		},

		// Tier 1: Arc - Neighbor Introduction
		"neighbor-hello": {
			notification: [
				"The new neighbor waved in the hallway. A wave happened back. Brief, noncommittal. Social interaction: technically complete.",
				"Passed the new neighbor on the stairs. They said hi. Hi happened in return. Mutual acknowledgment achieved.",
			],
			phoneFragment: [
				"A 'just moved in!' post in the building chat. That's probably them.",
				"The building chat has a new member. Same floor, apparently.",
			],
		},
		"neighbor-invite": {
			title: "The Invite",
			description:
				"A knock at the door. It's the neighbor from the hallway -- the one who waved. There's a thing happening on the roof tonight. Casual, they said. Just a few people from the building, some drinks. You're invited. They seem like they mean it.",
			choices: {
				go: {
					label: "Go up",
					description:
						"Roof thing with near-strangers. Could be nice. Could be draining. Hard to know in advance.",
				},
				pass: {
					label: "Pass",
					description:
						"Not tonight. Something came up. Nothing specific, just... something.",
				},
			},
			recap: {
				go: [
					"You went to the roof thing. Near-strangers, some drinks. It was fine. Maybe even nice. Hard to tell in the moment.",
					"The neighbor's invite led to an evening on the roof with people from the building. You showed up. That's the part that mattered.",
				],
				pass: [
					"The roof thing happened without you. You could hear them from your window. Sounded nice.",
					"You passed on the neighbor's invite. Something came up. Nothing specific.",
				],
			},
		},
	},

	weekStory: {
		openings: {
			good: [
				"Monday started and you had a list. By Sunday, some of it was done. More than usual, actually. The week moved and you moved with it.",
				"The week began like they all do\u2014with intentions. This time, some of them landed. Not all. But enough that you noticed.",
				"Seven days. A list. Some attempts. This week, the math worked out better than expected. Things happened when you clicked them. Not always, but often enough.",
				"You made it through. Not perfectly, not gracefully, but with something resembling momentum. The week had a shape to it.",
			],
			rough: [
				"Monday started. That's the most generous thing you can say about it. The list existed. The tasks existed. The connection between wanting and doing? That was harder to find.",
				"The week happened to you more than you happened to it. Days blurred. Tasks sat there, patient and untouched. You clicked buttons and watched nothing happen.",
				"Seven days of trying. Seven days of the gap between intention and action being wider than you remembered. The buttons didn't work. They rarely do, but this week they really didn't.",
				"It was a hard week. The kind where you look at a task, know you should do it, click it, and... nothing. Over and over. The mechanics of existence felt heavier than usual.",
			],
			survived: [
				"Monday started. Sunday came. In between: a week. Some things worked. Many things didn't. That's the math of it.",
				"The week had its moments. Brief windows where clicking a task actually did something. They didn't last, but they happened. That's not nothing.",
				"Seven days of mixed results. Some wins scattered among the losses. The ratio wasn't great, but you've seen worse. Probably.",
				"A week of attempts. The word 'attempt' doing a lot of heavy lifting there. Some succeeded. Most taught you what failure feels like again. As if you'd forgotten.",
			],
		},

		rhythm: {
			nightOwl: [
				"The late hours carried you, as they always do. When the world gets quiet, something in you wakes up.",
				"Night was where the work happened. The mornings were for recovering from being awake at the wrong times.",
				"You're a creature of the dark hours. This week proved it again. The 2am productivity spike is real and it's yours.",
				"Daytime was for surviving. Night was for actually getting things done. Your body knows its schedule even when the world disagrees.",
			],
			earlyBird: [
				"Mornings were your window. That brief stretch where things felt possible before the day wore you down.",
				"The early hours worked for you. By afternoon, the momentum had faded, but at least you had the morning.",
				"You got things done before noon or you didn't get them done at all. That's just how your wiring works.",
				"Something about morning light makes the tasks feel achievable. By evening, that feeling is a distant memory.",
			],
			neutralTime: [
				"The days had their rhythms. Some hours worked better than others, but nothing dramatic. Just the usual ebb and flow.",
				"Time moved. Tasks happened or didn't happen. No particular hour felt magical or cursed.",
				"The clock kept turning. Some moments were better for getting things done. Most moments were just moments.",
			],
			timeBlockObservations: [
				(best: TimeBlock, worst: TimeBlock) =>
					`${timeBlocks[best]} was where things clicked, and ${timeBlocks[worst].toLowerCase()} was where they didn't. At least there's a pattern.`,
				(best: TimeBlock, worst: TimeBlock) =>
					`If you look at when things actually worked, ${timeBlocks[best].toLowerCase()} stands out. ${timeBlocks[worst]}? Better not to look too closely.`,
				(best: TimeBlock, worst: TimeBlock) =>
					`The data says ${timeBlocks[best].toLowerCase()} was your time. ${timeBlocks[worst]} says you should probably just... not, during those hours.`,
			],
			allNighterSingle: [
				"One night you pushed through. Rode the wave past when you should have stopped. Worth it? Hard to say. The next day was a blur.",
				"There was an all-nighter in there. The kind where sleep feels optional until suddenly it very much isn't.",
				"You stayed up. All the way through. The 2am energy carried you until it didn't, and then morning was already happening.",
			],
			allNighterMultiple: [
				"Multiple all-nighters. Your sleep schedule is more of a suggestion at this point. The nights blurred together.",
				"You pushed through more than once. The late hours were productive. The following days were... less so.",
				"All-nighters, plural. You rode the nocturnal productivity waves and paid for it in daylight confusion.",
			],
		},

		basics: {
			dogGood: [
				"Azor got walked. Every time you tried, it worked. External accountability remains undefeated.",
				"The dog got his walks. That's one thing you can count on\u2014the guilt of a waiting dog is a powerful motivator.",
				"Azor didn't miss a walk. When another creature is depending on you, somehow the buttons work better.",
				"Dog walks: success. Turns out having someone stare at you expectantly is excellent for task completion.",
			],
			dogMixed: [
				"Azor got walked most of the time. Some days it was barely a walk\u2014more like standing outside briefly. But he got out.",
				"The dog walks were... mostly successful. A few were more 'quick trip outside' than 'actual walk.' He didn't complain.",
				"Azor got what he needed, more or less. Some proper walks, some minimal versions. He's patient like that.",
			],
			dogStruggled: [
				"Azor deserved better this week. The walks happened, but barely. A lot of standing outside pretending that counts.",
				"The dog walks were rough. More failures than successes. He still loves you, but there was definitely some canine disappointment.",
				"Azor got short-changed this week. You tried. The trying didn't always translate to walking. He forgives you. Probably.",
			],
			foodCooked: [
				"You cooked. Actually cooked. That's notable. The kitchen saw action beyond the microwave.",
				"Food was made. By you. With ingredients. This happens rarely enough to be worth mentioning.",
				"Cooking happened this week. Real cooking, not just heating. Mark the calendar.",
			],
			foodDelivery: [
				"You ate, mostly via delivery. The apps know your order by now. It's still eating. It counts.",
				"Food happened through delivery. Someone else did the cooking and brought it to your door. That's a valid system.",
				"Delivery sustained you. The cooking ambition exists in theory. In practice, there are apps for this.",
			],
			foodStruggled: [
				"Food was a challenge. The cooking didn't happen. The ordering didn't happen. You ate... probably.",
				"The eating situation wasn't great. Tasks involving food didn't cooperate. You survived on whatever was already there.",
			],
			variantsUsed: [
				"Sometimes you lowered the bar. Took the smaller version of the task. That's not giving up\u2014that's adapting.",
				"The minimal versions helped. When the full task wouldn't click, the smaller one sometimes did. Good enough is good enough.",
				"You used the easier options when they were available. That's what they're there for.",
			],
			survivalWrap: {
				good: [
					"The basics got covered. That's the foundation everything else sits on.",
					"Survival needs: met. That's more than some weeks manage.",
					"You kept yourself alive and functional. The baseline was maintained.",
				],
				rough: [
					"The basics were a struggle, but they happened. Mostly. Enough.",
					"Survival mode was engaged. It wasn't pretty, but you're still here.",
					"The fundamentals barely held together. But they held.",
				],
				survived: [
					"The basics were mixed. Some handled, some scraped by. A typical week, really.",
					"Survival requirements: technically met. The bar was low but you cleared it.",
					"The essentials got done, in their own imperfect way.",
				],
			},
		},

		attempts: {
			creativeSucceeded: [
				"The creative work happened. Actually happened. You clicked the task and it worked. That's rare enough to feel like magic. The odds were against you and you beat them.",
				"You practiced. Made something. The aspirational task that usually sits there mocking you\u2014this week, it cooperated. Write that down somewhere.",
				"Against all probability, the creative stuff clicked. The task that fails ninety-something percent of the time actually worked. You made something. Hold onto that.",
				"The music happened. Or the project. Whatever the creative thing was\u2014it worked this week. Those tasks have terrible odds and you beat them. That matters.",
			],
			creativeFailed: [
				"The creative tasks didn't happen. You clicked them. You tried. The connection between wanting to create and actually creating remains unreliable. It's not a new pattern.",
				"Practice didn't happen. The creative work sat on the list, got clicked a few times, went nowhere. The aspirational tasks are like that. They promise everything and deliver rarely.",
				"You tried the creative stuff. It didn't work. It usually doesn't. The gap between 'I want to make something' and actually making it is wide, and this week you couldn't cross it.",
				"The creative tasks failed. Every attempt. That's how it goes with the aspirational stuff\u2014the base rates are brutal and this week the odds won.",
			],
		},

		help: {
			phoneHeavy: [
				"Your phone saw a lot of this week. The scroll trap pulled you under again and again. It's always there, always ready to eat your momentum.",
				"You checked your phone more than you'd like to count. The algorithm kept you company when the tasks wouldn't cooperate. It wasn't helpful, but it was easy.",
				"The phone got a lot of attention. Scrolling through nothing, looking for something that wasn't there. The trap works because it's always available.",
				"Heavy phone usage this week. The scroll hole was deep and you fell in repeatedly. It's the default behavior when nothing else is working.",
			],
			phoneModerate: [
				"The phone pulled you in sometimes. Not constantly, but enough to notice. The scroll trap is patient\u2014it'll take whatever time you give it.",
				"Some phone checking happened. Moderate. The usual dance of picking it up, losing time, putting it down, wondering where the minutes went.",
				"You scrolled when things got hard. Not excessively, but it happened. The phone is always there with its promise of easy distraction.",
			],
			phoneLight: [
				"The phone stayed mostly in your pocket. When you did check it, you didn't lose too much time. That's something.",
				"Light phone usage. The scroll trap didn't get you much this week. Either things were working or you were too busy failing at tasks to scroll.",
				"You kept the phone checking to a minimum. The trap didn't spring as often as usual. A small victory.",
			],
			friendAcceptedAll: [
				"Your friend reached out and you said yes. Every time. Sometimes the rescue is the whole day. External momentum matters.",
				"The friend showed up when things were rough. You let them. That's harder than it sounds, saying yes when you feel like hiding.",
				"Friend rescue: accepted. All of them. Sometimes you need someone to pull you out of your own head. They did that.",
			],
			friendAcceptedSome: [
				"Your friend tried to help. Sometimes you let them. The rescues that worked mattered more than the ones you declined.",
				"The friend reached out. You said yes sometimes, no other times. Both are valid. At least some connection happened.",
				"Some friend rescues accepted, some turned down. It's a balance. You needed help and you took it when you could.",
			],
			friendDeclinedAll: [
				"Your friend tried to reach you. You said no. Every time. Sometimes you just can't, even when you know it would help.",
				"The friend offered rescue. You declined. Not because you didn't need it\u2014because accepting felt like too much. That happens.",
				"Friend reached out, you stayed in. It's not that you didn't want to see them. The gap between wanting and doing is wide.",
			],
			hermitSocialCost: [
				"The social stuff helped, but it also cost. You're wired to need alone time. The friend visits meant energy spent.",
				"Seeing people takes something out of you, even when it's good. The connection helped the momentum; your batteries needed recharging after.",
				"Social interaction is expensive for you. The friend time was worth it, but you felt the cost.",
			],
			socialBatteryBoost: [
				"Being around your friend charged you up. That's how you're wired\u2014people give you energy. The visits helped more than just the moment.",
				"The social connection energized you. You're the type who gets fuel from other people. The friend time was medicine.",
				"Friend time gave you more than it took. You run on social energy. The rescues were boosts, not just breaks.",
			],
			neutral: [
				"You got through the week with the usual coping mechanisms. Nothing dramatic. Just the quiet work of managing yourself.",
				"No major rescues needed. No major collapses either. Just a week of getting by.",
				"You managed. Quietly. Without fanfare. The week happened and you handled it in your own way.",
			],
		},

		closings: {
			good: [
				"You made it. The week ended and you're on the other side, intact. More got done than didn't. The dog is walked, the body is fed, the tasks have fewer checkmarks than you'd like but more than zero. That's a good week. That's enough.",
				"Sunday came and you survived it. Better than survived\u2014you actually accomplished things. The list got shorter. The systems worked, more or less. Next week will be its own thing, but this one? This one was okay.",
				"The week is over. You did things. Real things, not just existing. The buttons worked more often than they didn't. That's not nothing. That's actually kind of a lot. Take the win.",
				"Seven days, done. More successes than failures. The basics covered, some extras achieved. The dog still loves you. The friend still checks in. You're still here, and you did okay. That matters.",
			],
			rough: [
				"You survived. That's the word for it. Not thrived, not succeeded\u2014survived. The week threw everything at you and you're still here at the end of it. The dog still loves you. The tasks will still be there tomorrow. You made it through. That's enough. It has to be.",
				"It's over. The week, finally, is over. You got through it. Barely, sometimes, but you did. The gap between wanting and doing was wide and you stood on the wrong side of it most days. But you're here. You're still here.",
				"Seven days of rough. The buttons didn't work. The tasks sat there. You clicked and nothing happened, over and over. But it's done now. The week is behind you. Tomorrow is a new seed, a new set of odds. Maybe it'll be different. Maybe it won't. Either way, you'll try again.",
				"The week is over and you're still standing. Not a high bar, but you cleared it. The systems failed you, or you failed them\u2014hard to tell the difference sometimes. What matters is it's done. You rest now. You try again later.",
			],
			survived: [
				"The week ended. Somewhere in the middle between good and bad. Some things worked. Many things didn't. That's the typical math. The dog is walked enough, the food was eaten somehow, the creative stuff probably didn't happen but what else is new. You made it to Sunday. That's a complete week.",
				"You made it through. Not gracefully, not terribly. Just... through. The buttons worked sometimes. The tasks got done sometimes. The pattern is familiar by now. Next week will be more of the same, probably. But that's next week. This one is done.",
				"Seven days of mixed results. The ratio wasn't great but it wasn't disaster. The basics got covered, mostly. The aspirational stuff remains aspirational. The week happened and you happened with it. That's the deal.",
				"The week is over. You survived it, which is the baseline. Some wins, some losses, mostly the muddy middle. The dog still loves you. The friend still texts. The tasks will still be there tomorrow, patient as ever. Another week in the books. Onto the next one.",
			],
		},
	},
} as const;
