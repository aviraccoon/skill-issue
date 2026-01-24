import type { Day, TimeBlock } from "../state";

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
		newGame: "New Game",
		newGameConfirm: "Start a new game? Current progress will be lost.",
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
		nightPrompt: "It's late. You could sleep. Or...",
		sleep: "Sleep",
		pushThrough: "Push Through",

		// Friend rescue
		rescueCost: (cost: string) => `Meeting up will use ${cost}`,
		rescueDecline: "Not right now",

		// Day summary
		taskStats: (succeeded: number, attempted: number) =>
			`${succeeded} of ${attempted} tasks`,
		allNighterTitle: (day: Day, nextDay: Day | null) =>
			nextDay ? `${days[day]} / ${days[nextDay]}` : `${days[day]} (late)`,
		allNighterNarrative: (day: Day, nextDay: Day | null) =>
			`${days[day]} bled into ${nextDay ? days[nextDay] : "the next day"}. You pushed through. At some point you stopped.`,

		// Week complete
		weekComplete: "Week Complete",
		startNewWeek: "Start New Week",
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

	scrollTrap: [
		"Nothing new. You knew that.",
		"The algorithm thanks you.",
		"...anyway.",
		"30 minutes later...",
		"Azor glances at you. Looks away.",
		"The dog sighs. Or you imagine he does.",
		"You found nothing. As expected.",
		"Time passes. Nothing changes.",
	],

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
		good: "Things clicked today. Not everything, but enough.",
		rough: "A hard day. The buttons didn't want to work. Tomorrow exists.",
		mixed: "Some things happened. Some didn't. That's a day.",
	},

	allnighter: {
		wired: "You're wired. This could be productive.",
		someFuel: "You've got some fuel left. Might be worth it.",
		runningLow: "You're running low, but there's something there.",
		exhausted: "You're exhausted. One more attempt, maybe.",
	},

	weekNarrative: {
		good: "You made it through. The dog got walked. You ate food. Some tasks happened, some didn't. That's a week.",
		rough:
			"You survived. Barely, some days. The dog still loves you. You fed yourself, even if it was delivery every time. You're still here.",
		survived:
			"A week of attempts. Some worked. Most didn't. You had that one good moment where things clicked. Normal week, really.",
	},

	dog: {
		walked: "Azor got his walk. He's happy.",
		failedAttempt:
			"You tried to walk Azor. Stood outside briefly. He's disappointed but understands.",
		forcedMinimal:
			"You stood outside with Azor for a minute. It's not a walk, but it's something. He looks at you.",
		urgency: {
			normal: "Normal",
			waiting: "Azor's been waiting",
			urgent: "He really needs to go",
			critical: "Critical - he's desperate",
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
		low: {
			name: "Coffee",
			description: "Quick coffee, low pressure",
		},
		medium: {
			name: "Grab food",
			description: "Get something to eat together",
		},
		high: {
			name: "Explore somewhere",
			description: "Check out that new place",
		},
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
