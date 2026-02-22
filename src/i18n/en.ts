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
		noTasksAvailable: "Nothing left to do right now",
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
		hook: "A task management game where the controls don't work reliably.",
		description: [
			"A week of tasks. Four time blocks per day, three attempts each.",
			"Click tasks to do them. The room is just for show.",
			"The game saves after each action. Good luck.",
		],
		start: "Start",
	},

	onboarding: {
		firstTask: "Click a task in the list to see its details.",
		firstAttempt: "Press Attempt to try. It won't always work.",
		firstWeekend: "No time blocks today. Spend your 8 points however you want.",
		dismiss: "Got it",
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
		startNewWeek: "Start New Week",
		viewSummary: "View Summary",
		newGame: "New Game",
		seedLabel: "Seed",
		seedPlaceholder: "Enter seed (optional)",
		startSeeded: "Start with Seed",
		seededRunNotice: (day: string, seed: number) =>
			`Seeded run in progress: ${day} (seed ${seed})`,
		seededRunComplete: (seed: number) => `Seeded run complete (seed ${seed})`,
		settings: "Settings",
	},

	settings: {
		title: "Settings",
		close: "Close",
		theme: "Theme",
		language: "Language",
		accessibility: "Accessibility",
		clearData: "Clear all data",
		clearDataConfirm: "This removes all saves and progress. Are you sure?",
		clearDataYes: "Clear everything",
		clearDataNo: "Cancel",
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
		notEnoughPoints: (cost: number, remaining: number) =>
			`needs ${pl(cost, "point")}, ${remaining} remaining`,

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

		// Delivery style prefixes for screen readers (sr-only, not visible)
		deliveryPrefix: {
			notification: "Notification:",
			message: "Message:",
		},
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
			"Someone posted their morning routine. 47 steps. You close the app.",
			"An app you downloaded three months ago wants you to come back.",
			"A language learning app. Day 1 of 1. Again.",
			"Your screen time report is in. You don't open it.",
			"A meditation app sent you a notification about being present. On your phone.",
			"A group chat you forgot you were in. 200 unread. You mute it.",
			"Someone in a group chat is organizing something. 43 messages of logistics. You close it.",
			"You opened the phone. You closed the phone. That happened.",
			"Three apps want your attention. None deserve it.",
			"Someone liked your post from two weeks ago. That's it. That's the notification.",
			"A news alert. You read the headline. You didn't read the article.",
			"The same five people posted the same five things.",
			"You checked. Nothing. You'll check again in ten minutes.",
			"A brand wants to wish you a happy Thursday.",
			"Two notifications. Both marketing emails.",
			"Someone you went to school with is doing CrossFit now.",
			"A podcast recommendation. You add it to the list. The list has 47 podcasts.",
			"Someone shared an article. You saved it. You have 200 saved articles.",
			"Your banking app wants you to know about a new feature.",
			"A photo of someone's lunch. You don't know why you expected something different.",
			"A notification from a game you haven't played in weeks.",
			"An email. Just a receipt. For something you already have.",
			"You picked up the phone. You put it down. Nothing in between.",
			"The feed refreshed. Same content, different order.",
			"A push notification you already dismissed this morning.",
			"Someone posted a quote. It was fine. You scrolled past.",
		],
		scrollHole: [
			"You blinked and an hour passed.",
			"The rabbit hole was deep today.",
			"Where did that time go?",
			"You got sucked in. Hard.",
			"That was worse than usual.",
			"The algorithm won this round.",
			"...anyway. What were you doing?",
			"A before-and-after cleaning transformation. 4 million likes. You look at your floor.",
			"Someone your age just hit a life milestone. You look at your task list.",
			"Someone's meal prep for the week. Twelve containers. You close the app and look at the kitchen.",
			"The family chat. You've been meaning to reply for three days.",
			"A post about how it's okay to rest. You've been resting. It doesn't feel okay.",
			"You opened one app. Then another. Then another. Can't remember which came first.",
			"A thread. 47 posts long. You read all of them.",
			"Someone was wrong on the internet. You almost replied.",
			"Fifteen minutes reading comments under a post that doesn't affect your life.",
			"You compared yourself to a stranger and the stranger won.",
			"Someone organizing a fridge. Their fridge. You watched for twenty minutes.",
			"A debate in the comments. You have opinions. You kept them to yourself. But you read all of it.",
			"A listicle about habits of successful people. You read all ten. You're still on the couch.",
			"You watched three reels. Or thirty. Hard to tell.",
			"Someone's vacation photos. All of them. Every single one.",
			"A true crime video. Then another. Then it's dark outside.",
			"You went to check one thing. That was forty minutes ago.",
			"A news rabbit hole. Climate. Economy. Your thumb just keeps going.",
			"The comments had 800 replies. You're now an expert on something useless.",
			"You started reading about a topic you don't care about. You still don't care. But you're still reading.",
			"An argument between two strangers. You picked a side. You'll never know how it ends.",
			"Someone's home renovation timeline. You don't own a home. You watched every update.",
		],
		actualBreak: [
			"Huh. That was actually kind of nice.",
			"A meme made you laugh. That counts.",
			"You saw something that made you smile.",
			"Brief respite. Back to it.",
			"A moment of genuine entertainment.",
			"You put it down. Okay.",
			"A cat video. Twelve seconds of genuine calm.",
			"Someone's dog doing something ridiculous. You watch it twice.",
			"A meme that was actually funny. You almost sent it to someone.",
			"A good song in someone's story. You Shazam'd it.",
			"An old photo came up in your memories. You smiled.",
			"Someone's kid said something genuinely funny.",
			"A nature photo. Mountains. Big sky. You took a breath.",
			"A short animation. Sweet. You didn't need it, but it helped.",
			"A playlist someone shared. First song is good.",
			"A comic that nailed it. Four panels. You feel slightly lighter.",
			"Your friend's pet doing something absurd. Worth the check.",
			"A satisfying video. Pottery, or maybe soap cutting. Whatever. It helped.",
			"A joke that landed. Genuinely clever. You exhale.",
			"Someone recommended a show. You might actually watch it.",
			"A timelapse of a city at dusk. Two minutes of calm you didn't ask for.",
			"A raccoon getting into something it shouldn't. Relatable content.",
		],
		somethingNice: [
			"A friend posted something. You felt connected for a moment.",
			"Someone shared good news. It helped.",
			"You remembered people exist. That's something.",
			"A message notification. Someone's thinking of you.",
			"Something in your feed actually mattered.",
			"A moment of real human connection. Rare.",
			"Someone in a thread described exactly how it feels. You didn't reply, but you read it twice.",
			"A stranger's comment about not being able to start things. Two thousand likes. You're not alone in this.",
			"A friend posted something small and honest. You liked it. That counts as contact.",
			"Someone made a joke about executive dysfunction. It was funny because it was true.",
			"A friend texted. Just 'hey.' That's enough.",
			"An old friend liked something you posted. You forgot they followed you.",
			"A stranger replied to your comment. Kindly. That's rare.",
			"Someone shared a win. A small one. You're happy for them and it doesn't sting.",
			"A DM from someone checking in. They didn't need anything. Just checking.",
			"Someone said something vulnerable online. The replies were kind.",
			"A group chat that's actually funny right now. You laugh at three messages in a row.",
			"A photo your friend tagged you in. A good memory.",
			"A message: 'saw this and thought of you.' It's a stupid video. It's perfect.",
			"Someone noticed you were quiet and reached out.",
			"Your friend shared a meme that's clearly about you. Affectionately.",
			"A birthday message you weren't expecting.",
		],
		usefulFind: [
			"Wait. That's actually useful.",
			"You stumbled onto something helpful.",
			"Accidentally productive scrolling?",
			"Huh. The algorithm delivered something real.",
			"A genuinely useful thing. Mark the calendar.",
			"Something clicked. An idea for making things easier.",
			"A video essay about why things feel harder some days. It's not advice. Just acknowledgment.",
			"Someone posted a cleaning hack. It's stupidly simple. It might actually work.",
			"A thread about productivity that's actually realistic. Not the 5am cold shower kind.",
			"Someone's tip for making phone calls less awful. Huh. Worth trying.",
			"An article about a thing you've been putting off. Practical steps. Short ones.",
			"A free resource someone shared. Actually free. Actually useful.",
			"A review of something you've been meaning to buy. Saved you the research.",
			"Someone's workaround for a thing that's been bugging you.",
			"A tip you'll actually remember. Maybe. Probably not. But maybe.",
			"A short video explaining something you pretended to understand for years.",
			"A comparison post that answered a question you'd been sitting on.",
			"A recipe with actual measurements. Not 'a handful of' everything.",
			"A how-to that's under two minutes. That's all it took.",
			"A comment with the actual answer buried under a thread of useless replies.",
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
		// Obligation tasks (injected by events, not in seed pool)
		"dentist-visit": { name: "Dentist Appointment" },
		"vet-visit": { name: "Vet Visit" },
		"work-deadline": { name: "Work Deadline" },
		"tidy-for-inspection": { name: "Tidy for Inspection" },
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

		"fridge-empty": {
			notification: [
				"You opened the fridge. It's not that there's nothing good -- there's nothing. A condiment, maybe. Some optimistic leftovers from a week you don't remember.",
				"The fridge light comes on like it has something to show you. It doesn't. A jar of mustard and a question about your life choices.",
				"Empty fridge. Not 'empty' like you need to go shopping. Empty like the shopping has been not-happening for a while now.",
			],
			recap: [
				"The fridge was empty. Not in a dramatic way. In the slow, accumulating way of someone who keeps meaning to go shopping.",
				"You opened the fridge and found the evidence of several days of not dealing with it.",
			],
		},
		"good-song": {
			notification: [
				"A song came on and something shifted. Not fixed, not solved. Just -- shifted. The right notes at the right time.",
				"Whatever's playing right now is hitting different. You don't move to change it. For once, staying still feels right.",
				"The song caught you off guard. A melody you forgot you knew. For a few minutes, the apartment felt less like a container and more like a place.",
			],
		},
		"broken-mug": {
			notification: [
				"You dropped your mug. The good one. It hit the floor and now it's in three pieces and the morning is already going like that.",
				"Your favorite mug is on the floor in pieces. It's just a mug. It's not just a mug. It was the one that felt right.",
				"The mug broke. The one you always reach for without thinking. Now you'll have to think about it every time.",
			],
			recap: [
				"You broke your favorite mug. Small loss, but those are the ones that land.",
				"The mug broke. You'll use another one. It won't be the same.",
			],
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
			friendRescue: {
				opener: [
					"Hey, something about a pipe at your place? Want to get out for a bit?",
					"Heard there's a dripping situation. Coffee? My treat.",
				],
			},
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
			friendRescue: {
				hint: [
					"Glad the pipe thing's sorted. Making the call is always the hardest part.",
					"The leak's done? Good. One less thing following you around.",
				],
			},
		},
		"leak-worse": {
			notification: [
				"Maintenance is here. The water reached the apartment below. They need access to your kitchen. The next few hours aren't yours anymore.",
				"The landlord sent someone about the leak. They're under your sink now while you hover uselessly in the kitchen. This is your morning.",
			],
			recap: [
				"The leak you put a towel on? It reached the apartment below. Maintenance showed up and took over your morning.",
				"Someone came about the leak. Not because you called. Because it got bad enough that you didn't have a choice anymore.",
			],
			storyOpener: [
				"The apartment had a leak this week. That set the tone.",
				"Water has a way of making itself the priority. This week, it did.",
			],
			storyCloser: [
				"The leak is handled. Not by you, but it's handled. The towel is still wet.",
				"Someone fixed what you couldn't bring yourself to call about. The apartment dries. The pattern doesn't.",
			],
			phoneFragment: [
				"You keep almost googling plumbers. The search bar remembers your hesitation.",
				"A home repair thread. The comments all say 'call someone.' Noted.",
			],
			friendRescue: {
				opener: [
					"Saw maintenance outside your building. You okay?",
					"The pipe thing got worse? Come hang out, get out of there.",
				],
				hint: [
					"The pipe thing -- next time, maybe call sooner? No judgment.",
					"That plumbing stuff is stressful. At least it's getting handled now.",
				],
			},
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
				go: [
					{
						label: "Go get it",
						description:
							"Leave the apartment. On purpose. Walk there and back. It's not nothing.",
						recap:
							"You went out and got the package. Fifteen-minute walk, round trip. The hardest part was the door.",
					},
					{
						label: "Just go",
						description:
							"It's fifteen minutes. You've been thinking about it longer than that.",
						recap:
							"You just went. Fifteen minutes out, fifteen back. Shorter than the debate in your head.",
					},
					{
						label: "Get it before they send it back",
						description: "The window is closing. Sometimes that helps.",
						recap:
							"You got it before they sent it back. The closing window did what willpower couldn't.",
					},
				],
				"let-go": [
					{
						label: "Let it go",
						description:
							"It'll get sent back. You'll reorder it eventually. Or you won't need it. Maybe.",
						recap:
							"The package went back. You'll reorder it. Probably. It already feels like it never existed.",
					},
					{
						label: "It's not worth the walk",
						description:
							"The walk isn't the problem. Deciding to walk is. And you've decided.",
						recap:
							"You decided it wasn't worth the walk. The walk was never the real obstacle.",
					},
					{
						label: "You'll reorder it",
						description:
							"Future you can deal with it. Future you deals with everything.",
						recap:
							"You'll reorder it. That's what you told yourself. Future you nodded along.",
					},
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
			friendRescue: {
				opener: [
					"The construction noise sounds awful. Want to come hang out somewhere quiet?",
					"Jackhammers again? Get out of there for a bit. Let's go somewhere.",
				],
			},
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
			taskModification: {
				name: "Cook for Neighbor",
				variantName: "Order Pizza for Neighbor",
			},
			recapSucceeded: [
				"You cooked for the neighbor. A welcome gesture. The kind of thing a person who has it together would do. You did it anyway.",
				"The new neighbor got a home-cooked meal out of you. Pressure works, apparently, when it comes with a face.",
			],
			recapVariant: [
				"You ordered pizza for the neighbor. A welcome gesture that required a phone and a doorbell, not a kitchen.",
				"The new neighbor got pizza. You ordered it. Close enough to neighborly.",
			],
		},
		"neighbor-invite": {
			title: "The Invite",
			description:
				"A knock at the door. It's the neighbor from the hallway -- the one who waved. There's a thing happening on the roof tonight. Casual, they said. Just a few people from the building, some drinks. You're invited. They seem like they mean it.",
			storyOpener: [
				"The neighbor knocked this week. That was unexpected.",
				"Someone in the building invited you to something. That's what this week had.",
			],
			storyCloser: [
				"The neighbor's invite changed the shape of the week. Small thing. Big difference.",
				"You live in a building full of people. This week, one of them noticed you. That matters more than it should.",
			],
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

		// =====================
		// Tier 1: Arc - Power Outage
		// =====================

		"power-flicker": {
			notification: [
				"The lights flickered. Just for a second. Could be nothing. Probably nothing.",
				"A brief flicker -- the lights dimmed and came back. The fridge made a sound it doesn't usually make.",
				"The lights blinked. Everything came back on. You noticed, filed it under 'not my problem,' and moved on.",
			],
		},
		"power-out": {
			notification: [
				"The power's out. No light, no internet, no fridge hum. Just you and the silence and the realization that everything you do requires electricity.",
				"Everything went dark. The building's power is out. Your phone has battery. Your patience doesn't.",
				"Power's gone. The apartment is quiet in a way it never is. Every plan you had just became 'wait.'",
			],
			recap: [
				"The power went out. A whole day of realizing how much of your routine is plugged in.",
				"No electricity for a day. You sat in the quiet and waited. Not unlike a normal day, but louder about it.",
			],
			phoneFragment: [
				"Building chat: 'power out for anyone else??' Twelve replies in two minutes.",
				"You're doom-scrolling about the outage on a phone that's losing battery. Priorities.",
			],
			friendRescue: {
				opener: [
					"No power? Come over. I have electricity and coffee.",
					"Heard the power's out over there. Want to come hang out?",
				],
				hint: [
					"A whole day without power is brutal. Go easy on yourself.",
					"No power means no routine. That's a lot of structure gone at once.",
				],
			},
		},
		"power-back": {
			notification: [
				"The power came back. The fridge hums. The router blinks. You didn't realize how tense you were until the noise returned.",
				"Lights on. The apartment fills with the sound of things doing their jobs again. You exhale.",
				"Power's back. The clock on the microwave is blinking 12:00. You won't fix it. It'll blink until the next outage.",
			],
		},

		// =====================
		// Tier 2: Obligation - Dentist
		// =====================

		"dentist-reminder": {
			notification: [
				(day: Day, blocks: readonly TimeBlock[]) =>
					`Calendar: Dentist Appointment -- ${days[day]}, ${timeBlocks[blocks[0] ?? "afternoon"]}`,
				(day: Day, blocks: readonly TimeBlock[]) =>
					`Reminder: Dentist on ${days[day]}. ${timeBlocks[blocks[0] ?? "afternoon"]}.`,
			],
		},
		"dentist-missed": {
			notification: [
				"You didn't go. The guilt sits in your chest like a stone. You'll reschedule. You always say that.",
				"The appointment came and went. You were right here the whole time. That's the part that stings.",
			],
			recap: [
				"The dentist appointment happened without you. You were in the building the whole time.",
				"You missed the dentist. The rescheduling email is sitting in drafts.",
			],
			friendRescue: {
				hint: [
					"Did you reschedule the dentist yet? No rush. Just... eventually.",
					"The dentist thing -- it's fine. Just try to rebook when you can.",
				],
			},
		},

		// =====================
		// Tier 2: Obligation - Vet
		// =====================

		"vet-reminder": {
			notification: [
				(day: Day, blocks: readonly TimeBlock[]) =>
					`Calendar: Azor's Vet Appointment -- ${days[day]}, ${timeBlocks[blocks[0] ?? "morning"]}`,
				(day: Day, blocks: readonly TimeBlock[]) =>
					`Reminder: Vet for Azor on ${days[day]}. ${timeBlocks[blocks[0] ?? "morning"]}.`,
			],
		},
		"vet-missed": {
			notification: [
				"You didn't take him. He's fine. He doesn't know. That's worse, somehow.",
				"The vet appointment passed. Azor looked at you when you picked up his leash and put it back down.",
			],
			recap: [
				"You missed Azor's vet appointment. He's fine. Probably. You'll call to reschedule. Probably.",
				"The vet visit didn't happen. Azor doesn't know he was supposed to go. You do.",
			],
			friendRescue: {
				hint: [
					"You should reschedule the vet when you can. For Azor.",
					"The vet thing -- I know it's hard. But he needs you on that one.",
				],
			},
		},

		// =====================
		// Tier 2: Obligation - Work Deadline
		// =====================

		"work-reminder": {
			notification: [
				(day: Day) =>
					`Reminder: Work deadline ${days[day]}. You know. You've known.`,
				(day: Day) =>
					`Calendar: Project deadline -- ${days[day]}. The date hasn't moved.`,
			],
		},
		"work-missed": {
			title: "The Deadline Passed",
			description:
				"The deadline was today. The day is over. The work isn't done. Your inbox already has the follow-up email you haven't opened. What now?",
			storyOpener: [
				"There was a deadline this week. That's the shape the week took.",
				"The work deadline hung over everything. Even the days before it, somehow.",
			],
			storyCloser: [
				"The deadline passed. One way or another, it's behind you. The inbox will have opinions about that tomorrow.",
				"Work happened or it didn't. Either way, the week moved on. The email is still there.",
			],
			choices: {
				"do-it-now": [
					{
						label: "Do it now",
						description:
							"Stay up. Power through. Get it done tonight. The energy cost will be brutal but the thing will be done.",
						recap:
							"The work deadline passed, but you stayed up and powered through it. The next day was a write-off. The work exists, though.",
					},
					{
						label: "Pull an all-nighter",
						description:
							"Sleep is a suggestion. The deadline isn't. You'll feel terrible tomorrow but at least the work will exist.",
						recap:
							"You missed the deadline. Then you pulled an all-nighter to finish it anyway. Worth it? Hard to say from inside the exhaustion.",
					},
					{
						label: "Stay up and finish it",
						description:
							"The night is young. You're not, but the night is. Sit down. Open the laptop. Go.",
						recap:
							"The deadline came and went. You stayed up and finished it that night. The bags under your eyes had bags.",
					},
				],
				"let-it-go": [
					{
						label: "Let it go",
						description:
							"It's done. Not the work -- the day. You'll deal with it tomorrow. Or you won't.",
						recap:
							"The work deadline passed. You let it. Sometimes that's the only honest option.",
					},
					{
						label: "Call in sick",
						description:
							"Tomorrow you'll send the email. Woke up with something. Nonspecific. Bought yourself a day. Maybe.",
						recap:
							"You called in sick. Not technically a lie -- the feeling in your stomach when you think about the deadline is definitely a symptom of something.",
					},
					{
						label: "Close the laptop",
						description:
							"The screen goes dark. The deadline doesn't care. Neither do you, right now. Tomorrow's problem.",
						recap:
							"You missed the deadline and closed the laptop. The follow-up email is still unread. Tomorrow's problem.",
					},
					{
						label: "Pretend you didn't see the email",
						description:
							"The notification is there. You're choosing not to look. That's a decision. Technically.",
						recap:
							"The deadline happened. You didn't. The email sits in your inbox like a small monument to the gap between planning and doing.",
					},
				],
			},
			friendRescue: {
				opener: [
					"That work thing still weighing on you? Let's go somewhere.",
					"Hey. The deadline stuff. Want to not think about it for an hour?",
				],
				hint: [
					"The work deadline -- don't spiral on it. It happened. Deal with the next thing.",
					"Everyone misses deadlines. The world doesn't end. It just feels like it should.",
				],
			},
		},

		// =====================
		// Tier 2: Obligation - Building Inspection
		// =====================

		"inspection-notice": {
			notification: [
				(day: Day, blocks: readonly TimeBlock[]) =>
					`Notice: Building inspection -- ${days[day]}, ${timeBlocks[blocks[0] ?? "afternoon"]}. Please ensure your unit is presentable.`,
				(day: Day, blocks: readonly TimeBlock[]) =>
					`Landlord notice: Apartment inspection on ${days[day]}. ${timeBlocks[blocks[0] ?? "afternoon"]}.`,
			],
		},
		"inspection-failed": {
			notification: [
				"The landlord came. You saw their eyes move across the apartment. The dishes. The laundry. The everything. They didn't say much. They didn't have to.",
				"Inspection happened. You were here for it. So was everything else -- every unwashed dish, every pile, every surface that tells the story of a week you couldn't manage.",
			],
			recap: [
				"The landlord inspected your apartment. The apartment told on you. Every surface was evidence.",
				"The inspection happened. You were present. So was every dish, every pile, every postponed chore. The landlord's face said enough.",
			],
			storyOpener: [
				"The landlord came this week. That's the part you remember.",
				"Someone saw how you've been living. That happened this week. Everything else is details.",
			],
			storyCloser: [
				"The inspection is over. The apartment is the same. You're the same. But someone saw it now.",
				"The landlord left. The dishes are still there. Nothing changed except that someone else knows.",
			],
			friendRescue: {
				opener: [
					"The inspection thing -- don't worry about it. Want to get out?",
					"Hey. Heard about the landlord visit. That's rough. Come hang out.",
				],
				hint: [
					"The apartment thing -- everyone's place is a mess. Theirs included, probably.",
					"Don't let the inspection get to you. It's a snapshot, not a verdict.",
				],
			},
		},

		// =====================
		// Tier 2: Opportunity - Rooftop BBQ
		// =====================

		"rooftop-bbq": {
			title: "Rooftop Thing",
			description:
				"Someone put a note under your door. Building BBQ on the roof tonight. There's even a little drawing of a grill. You can hear chairs scraping above you. People are going. People you've maybe nodded at in the hallway. It sounds like it could be nice. It also sounds like a lot.",
			storyOpener: [
				"There was a thing on the roof this week. That was the bright spot.",
				"The building had a BBQ. That's what you'll remember about this week.",
			],
			storyCloser: [
				"The rooftop thing was nice. You went and it was nice. That's allowed to be the takeaway.",
				"One evening on the roof with near-strangers. It shouldn't matter this much. It does.",
			],
			choices: {
				go: [
					{
						label: "Go up",
						description:
							"Roof. People. Food you didn't make. Conversation with near-strangers. The full experience.",
						recap:
							"You went to the rooftop BBQ. There were people and food and the kind of easy conversation that comes with shared grill smoke. You stayed longer than you planned.",
					},
					{
						label: "Go to the thing",
						description:
							"You can hear them up there. Might as well see what it's about. You can always leave.",
						recap:
							"The rooftop thing happened and you were there for it. The food was good. The company was fine. You can always leave, but you didn't.",
					},
					{
						label: "Head up",
						description:
							"The roof is one flight of stairs. The hardest part is the door.",
						recap:
							"You went up. One flight of stairs, one door, one evening of being around people. The stairs were the easy part.",
					},
				],
				"stop-by": [
					{
						label: "Stop by briefly",
						description:
							"Show face, grab a plate, leave before it gets draining. Strategic socializing.",
						recap:
							"You stopped by the roof thing. Grabbed a plate, said hi, left before the energy ran out. Efficient.",
					},
					{
						label: "Quick appearance",
						description:
							"Go up, be seen, come back down. Five minutes. Ten, tops.",
						recap:
							"You made a quick appearance on the roof. Ten minutes of being a person who goes to things. Then back downstairs.",
					},
					{
						label: "Just for a bit",
						description:
							"A brief visit. Enough to count, not enough to exhaust.",
						recap:
							"You went up for a bit. Just long enough to eat something and remember what other people sound like up close.",
					},
				],
				"stay-in": [
					{
						label: "Stay in",
						description:
							"The roof will be there. So will you, down here, where it's quiet.",
						recap:
							"The BBQ happened one floor up. You could hear it through the ceiling. It sounded fine. You were fine too.",
					},
					{
						label: "Not tonight",
						description:
							"The note goes on the counter. Maybe next time. Maybe.",
						recap:
							"The building had a BBQ. You had your apartment. Both are valid venues for a Saturday.",
					},
					{
						label: "Pass",
						description: "Social energy: insufficient. The couch understands.",
						recap:
							"There was a thing on the roof and you weren't at it. The evening was quiet. Not bad, just quiet.",
					},
				],
			},
		},

		// =====================
		// Tier 2: Opportunity - Friend's Birthday
		// =====================

		"friends-birthday": {
			title: "Birthday",
			description:
				"Your friend's birthday is today. There's a thing happening -- drinks, people, probably cake. You said you'd be there. That was three days ago when 'being there' felt possible. Now it's today and being there requires putting on real clothes, leaving the apartment, and sustaining multiple conversations. The intention was genuine. The execution is another matter.",
			storyOpener: [
				"Your friend had a birthday this week. That anchored everything.",
				"There was a birthday. Theirs. That's the thing that happened this week.",
			],
			storyCloser: [
				"The birthday happened. Whether you were there or not, your friend knows you thought about it. That's something.",
				"Birthdays keep coming. People keep mattering. The gap between caring and showing up is real, but so is the caring.",
			],
			choices: {
				"go-to-party": [
					{
						label: "Go to the party",
						description:
							"Get dressed. Leave. Be there. It's their birthday. You said you would.",
						recap:
							"You went to the birthday thing. Real clothes, real people, real conversation. Your friend was glad you came. So were you, eventually.",
					},
					{
						label: "Show up",
						description:
							"You said you'd be there. The gap between saying and doing is wide, but not always uncrossable.",
						recap:
							"You showed up. The gap between saying and doing closed just enough. Your friend smiled when they saw you.",
					},
					{
						label: "Go",
						description:
							"Just go. Don't think about it too much. Thinking is where the leaving stops happening.",
						recap:
							"You went. Didn't think about it too much, just did it. The party was loud and your friend was happy and for a few hours the world was bigger than the apartment.",
					},
				],
				"send-message": [
					{
						label: "Send a message",
						description:
							"Type something. Send it. It's not nothing. It's not the same, but it's not nothing.",
						recap:
							"You sent the birthday message. Heartfelt emoji, genuine words. Not the same as being there, but not nothing.",
					},
					{
						label: "Text happy birthday",
						description:
							"A message, a few words, maybe an emoji. Low commitment, but sincere.",
						recap:
							"Happy birthday, sent. The text was short but you meant it. Your friend replied with a heart.",
					},
					{
						label: "Write something nice",
						description:
							"You can't go, but you can reach out. The phone is right here.",
						recap:
							"You wrote something nice. Couldn't be there in person, but the message was real.",
					},
				],
				"text-tomorrow": [
					{
						label: "You'll text tomorrow",
						description:
							"Tomorrow. Definitely tomorrow. The thought counts, right? The thought always counts.",
						recap:
							"You didn't text. You were going to. Tomorrow, you said. Tomorrow is now last week.",
					},
					{
						label: "Later",
						description:
							"Not now. You'll think of something good to say when you're not... this. Later.",
						recap:
							"Later never came. Or it came and you still didn't text. The birthday was last week now.",
					},
					{
						label: "You'll figure it out",
						description:
							"Something will come to you. The right words, the right moment. Just not this one.",
						recap:
							"The right moment didn't arrive. Neither did a text. Your friend probably understands. Probably.",
					},
				],
			},
		},

		// =====================
		// Tier 2: Opportunity - Nice Weather
		// =====================

		"nice-weather-opportunity": {
			title: "Outside",
			description:
				"It's one of those days. The kind of day where the light coming through the window is almost aggressive in how nice it is. Warm air, clear sky, the whole production. The kind of day that feels wasted from indoors. The door is right there.",
			choices: {
				"go-for-walk": {
					label: "Go for a walk",
					description:
						"Leave the apartment. Walk around. Feel the sun on your face. It's simple in theory.",
				},
				"open-window": {
					label: "Open the window",
					description:
						"The outside can come in. Fresh air, sounds of life, sun on the desk. Without the leaving part.",
				},
				later: {
					label: "Later",
					description:
						"The weather will probably hold. And if it doesn't, that's also fine.",
				},
			},
			recap: {
				"go-for-walk": [
					"You went outside. On purpose. The sun was real and the air was warm and for twenty minutes you were a person who goes for walks.",
					"The walk happened. Fresh air, sunlight, the whole thing. Simple in execution, impossible in initiation. But it happened.",
				],
				"open-window": [
					"You opened the window. The outside came in. It wasn't the same as going out, but the air was good.",
					"Window open, fresh air in. A compromise between inside and outside. Both parties found it acceptable.",
				],
				later: [
					"The nice weather came and went. So did 'later.'",
					"It was nice outside. You know because the window exists. 'Later' never materialized, but then, it rarely does.",
				],
			},
		},

		// =====================
		// Tier 2: Opportunity - Creative Spark
		// =====================

		"creative-spark": {
			title: "The Idea",
			description:
				"Something clicked. An idea, a direction, a thing you could make. It arrived without warning, the way they always do -- at a time when you have other things to deal with. You could chase it now, while it's alive. Or you could write it down and hope it survives until later. It won't. They never do. But maybe this one's different.",
			storyOpener: [
				"Something creative happened this week. That changes the shape of it.",
				"The idea arrived midweek. That's what made this one different.",
			],
			storyCloser: [
				"The creative thing happened or it didn't. Either way, the spark was real. That part isn't nothing.",
				"You had an idea this week. What you did with it is its own story. But you had it.",
			],
			choices: {
				"go-for-it": [
					{
						label: "Go for it",
						description:
							"Drop everything. The idea is here now. Everything else can wait.",
						recap:
							"You chased the idea. Dropped everything else, sat down, and made something. It cost you the rest of the day but the thing exists now.",
					},
					{
						label: "Start now",
						description:
							"While it's fresh. While you can still see it clearly. Before the feeling fades.",
						recap:
							"You started while the idea was fresh. Hours disappeared. The thing you made isn't finished, but it's real.",
					},
					{
						label: "Sit down and do it",
						description:
							"The spark is here. Your energy isn't, but the spark doesn't care about that.",
						recap:
							"You sat down and did the thing. Energy be damned. The creative spark burned through the fog for a few hours.",
					},
				],
				"think-about-it": [
					{
						label: "Think about it",
						description:
							"Let it simmer. Turn it over. Maybe it'll be clearer after some time.",
						recap:
							"You thought about the idea. It's still there, somewhere, in the back of your mind. Simmering. Maybe.",
					},
					{
						label: "Write it down",
						description:
							"A note. A voice memo. Something to anchor it before it dissolves.",
						recap:
							"You wrote it down. A note on your phone between grocery lists and passwords. Whether you'll find it again is another question.",
					},
				],
				"not-today": [
					{
						label: "Not today",
						description:
							"The idea can wait. You have things to do. Important things. Theoretically.",
						recap:
							"The idea came and you let it pass. There were other things to do. Whether you did them is a separate question.",
					},
					{
						label: "Maybe later",
						description:
							"Later, when you have more energy. Later, when the timing is right. Later.",
						recap:
							"The creative moment arrived and departed. 'Maybe later' is where ideas go to become regrets.",
					},
				],
			},
		},

		// =====================
		// Tier 2: Arc - Dog Emergency
		// =====================

		"azor-sick": {
			notification: [
				"Azor didn't eat this morning. He looked at the bowl and walked away. He never does that.",
				"Something's off with Azor. He's lying in his spot but not sleeping. Just... staring. Dogs don't stare at nothing without reason.",
				"Azor threw up. Once, small. He seems okay after, but he's quieter than usual. You're watching him from across the room.",
			],
			phoneFragment: [
				"You googled 'dog not eating.' The results range from 'he's fine' to 'emergency.' Helpful.",
				"A pet health forum says 'monitor for 24 hours.' You're already monitoring. You've been monitoring since breakfast.",
			],
			friendRescue: {
				opener: [
					"How's Azor doing? Want some company?",
					"Worried about Azor? Let's go for a walk. Both of you could use the air.",
				],
				hint: [
					"Keep an eye on him. If it doesn't clear up, take him in. You'll know.",
					"Dogs get weird sometimes. He's probably fine. But trust your gut on this.",
				],
			},
		},
		"azor-vet-choice": {
			title: "Azor",
			description:
				"He's still not right. The not-eating continued, and now he's doing that thing where he follows you from room to room but won't settle. You know what the right move is. The emergency vet is open. The walk there is fifteen minutes. The cost is... you'll deal with the cost. The question isn't what to do. The question is whether you can make yourself do it right now.",
			storyOpener: [
				"It was the week you took Azor to the vet. That's the part that stays.",
				"Azor needed you this week. You showed up. The rest of the week arranged itself around that.",
			],
			storyCloser: [
				"You did the hard thing for someone who depends on you. The morning it cost you was worth it. You know that. You knew it then.",
				"Azor's fine. The morning you lost is gone. But when he climbs onto the couch next to you, you know it was right.",
			],
			choices: {
				"take-him-in": [
					{
						label: "Take him in",
						description:
							"Leash, door, walk, vet. Your morning is gone but he'll be looked at.",
						recap:
							"You took Azor to the vet. The morning disappeared into waiting rooms and worried silence. He let you hold his leash the whole time.",
					},
					{
						label: "Go now",
						description:
							"Don't think about it. Grab the leash. He needs you to be the person who handles things.",
						recap:
							"You went. Didn't think, just grabbed the leash and walked. The vet said you did the right thing. Azor leaned against your leg in the waiting room.",
					},
				],
				"wait-and-see": [
					{
						label: "Wait and see",
						description:
							"He might be fine by tonight. Dogs get weird sometimes. You'll watch him.",
						recap:
							"You waited. Watched him from across the room. Told yourself dogs get weird sometimes. He didn't get better.",
					},
					{
						label: "Give it a day",
						description:
							"Twenty-four hours. If he's still off tomorrow, then you'll go. That's reasonable.",
						recap:
							"You gave it a day. The day passed. He wasn't better. The reasonable window closed while you watched.",
					},
				],
			},
		},
		"azor-recovered": {
			notification: [
				"The vet said he's fine. Something he ate, probably. Medication for a few days. He's already perked up. The relief hits you harder than you expected.",
				"Azor's better. Eating again, tail going, the whole performance. The vet visit was worth it. The worry was the expensive part.",
			],
			recap: [
				"Azor's fine. The vet said so. The morning you spent in the waiting room bought peace of mind and a dog who's eating again.",
				"The vet visit paid off. Azor recovered quickly. You recovered from the worry less quickly.",
			],
			friendRescue: {
				hint: [
					"Glad Azor's doing better. You did the right thing taking him in.",
					"See? He's fine. And you handled it. Remember that next time you're stuck.",
				],
			},
		},
		"azor-worse": {
			notification: [
				"Azor's worse. He won't get up. The waiting-and-seeing is over. The emergency vet isn't optional anymore. The guilt of yesterday's hesitation sits in your stomach like a stone.",
				"He's not okay. You knew yesterday and you waited anyway. The leash is by the door. The vet is a fifteen-minute walk that should have happened twenty-four hours ago.",
			],
			recap: [
				"Azor got worse because you waited. The emergency vet visit was harder, scarier, and longer than it would have been the day before. You're still not sure he's okay.",
				"You waited on the vet. Azor paid for it with a worse day. The guilt of 'I should have gone yesterday' isn't going anywhere.",
			],
			storyOpener: [
				"It was the week Azor got sick. Everything else happened around that.",
				"Most of the week was fine. And then there was Azor.",
			],
			storyCloser: [
				"Azor's not right. The week ended and you're still watching him. The rest of it -- the tasks, the attempts -- background noise around the thing that actually matters.",
				"He's not okay yet. You keep checking. The vet said to wait. You're not good at waiting.",
			],
			friendRescue: {
				opener: [
					"How's Azor? I've been thinking about him. Want company?",
					"Is Azor okay? I can come over. Or we can go out. Whatever you need.",
				],
				hint: [
					"He's going to be fine. But next time -- don't wait, okay? For him.",
					"I know you feel bad about the vet thing. He doesn't hold it against you. Dogs don't work like that.",
				],
			},
		},

		// =====================
		// Tier 2: Contextual Task Variant - Friend Visits
		// =====================

		"friend-visits": {
			notification: [
				"Hey, thinking of coming over later. Cool?",
				"I'm free tonight, want to hang out at yours?",
			],
			taskModification: {
				name: "Cook for Friend",
				variantName: "Order Pizza for Friend",
			},
			recap: [
				"Your friend came over. The cooking didn't happen, but the company did. That was the point anyway.",
				"The friend stopped by. You didn't cook. You didn't need to. Being around someone was enough.",
			],
			recapSucceeded: [
				"Your friend came over and you cooked for them. Actual food, in your kitchen, for another person. It wasn't a masterpiece but it existed.",
				"The friend stopped by. You cooked. Real cooking, not just the idea of it. Having someone to cook for made the difference.",
			],
			recapVariant: [
				"Your friend came over. You ordered pizza. Nobody pretended that was cooking. It was better.",
				"The friend stopped by and you ordered food together. Sharing a pizza on the couch counts. It counts.",
			],
			friendRescue: {
				opener: [
					"I'm already here. You seem off. Want to go do something?",
					"Hey. I can tell it's a rough one. Let's get out for a bit.",
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
			/** When a night owl's best block is actually night -- data confirms identity. */
			nightOwlConfirmed: [
				(worst: TimeBlock) =>
					`Night delivered. ${timeBlocks[worst]} didn't. Your body knew the schedule all along.`,
				(worst: TimeBlock) =>
					`The numbers agree with your circadian rhythm. Night worked. ${timeBlocks[worst]} was dead weight.`,
				(worst: TimeBlock) =>
					`Night was your time, and the success rates prove it. ${timeBlocks[worst]} was just waiting for sunset.`,
			],
			/** When a night owl's best block is NOT night -- data contradicts identity. */
			nightOwlSurprised: [
				(best: TimeBlock, worst: TimeBlock) =>
					`Somehow ${timeBlocks[best].toLowerCase()} was where things actually worked this week. Night didn't show up the way it usually does. ${timeBlocks[worst]} was the worst of it.`,
				(best: TimeBlock, worst: TimeBlock) =>
					`The data says ${timeBlocks[best].toLowerCase()} was your best window. Not night. ${timeBlocks[worst]} was a write-off either way.`,
				(best: TimeBlock, worst: TimeBlock) =>
					`${timeBlocks[best]} outperformed night this week. Your body's schedule got its own schedule wrong. ${timeBlocks[worst]} was just noise.`,
			],
			/** When an early bird's best block is actually morning -- data confirms identity. */
			earlyBirdConfirmed: [
				(worst: TimeBlock) =>
					`Morning came through. ${timeBlocks[worst]} didn't. The early window is real.`,
				(worst: TimeBlock) =>
					`The numbers back it up: morning was your time. ${timeBlocks[worst]} was where things fell apart.`,
				(worst: TimeBlock) =>
					`Morning delivered. ${timeBlocks[worst]} was a different story. You got your hours right.`,
			],
			/** When an early bird's best block is NOT morning -- data contradicts identity. */
			earlyBirdSurprised: [
				(best: TimeBlock, worst: TimeBlock) =>
					`${timeBlocks[best]} beat morning this week. The early-riser advantage didn't materialize. ${timeBlocks[worst]} was the worst of it.`,
				(best: TimeBlock, worst: TimeBlock) =>
					`Your morning window didn't hold. ${timeBlocks[best]} was actually where things clicked. ${timeBlocks[worst]} was dead time.`,
				(best: TimeBlock, worst: TimeBlock) =>
					`The data says ${timeBlocks[best].toLowerCase()}, not morning. Your wiring took the week off. ${timeBlocks[worst]} didn't help either.`,
			],
			allNighterSingle: [
				"One night you pushed through. Rode the wave past when you should have stopped. Worth it? Hard to say. The next day was a blur.",
				"There was an all-nighter in there. The kind where sleep feels optional until suddenly it very much isn't.",
				"You stayed up. All the way through. The 2am energy carried you until it didn't, and then morning was already happening.",
			],
			allNighterSingleFlat: [
				"You stayed up all night. Nothing came of it. The hours passed and you were just... awake.",
				"There was an all-nighter in there. Not the productive kind. Just the awake kind.",
				"One night you pushed through. Through to nothing. The 2am energy never showed.",
			],
			allNighterMultiple: [
				"Multiple all-nighters. Your sleep schedule is more of a suggestion at this point. The nights blurred together.",
				"You pushed through more than once. The late hours were productive. The following days were... less so.",
				"All-nighters, plural. You rode the nocturnal productivity waves and paid for it in daylight confusion.",
			],
			allNighterMultipleFlat: [
				"Multiple all-nighters. Nothing to show for them. Just lost sleep stacked on lost sleep.",
				"You stayed up more than once. The late hours weren't productive. The following days weren't either.",
				"All-nighters, plural. The nocturnal productivity never materialized. Just you and the ceiling.",
			],
			weeklyShape: {
				improving: [
					"The first few days were rough. Then something shifted and the second half actually worked.",
					"It took a while to find the rhythm. By midweek, things started clicking. Late momentum is still momentum.",
					"The week got better as it went. Monday you was struggling. Thursday you was getting things done.",
				],
				/** Improving, but a big event in the first half explains the rough start. */
				improvingEvent: [
					"The early days took a hit. After that settled, the second half found its footing.",
					"Something knocked you off balance early on. The rest of the week was recovery, and the recovery worked.",
				],
				declining: [
					"The week started strong. By Thursday, whatever was carrying you had run out.",
					"Early momentum didn't last. The first half had a rhythm. The second half lost it.",
					"You front-loaded the productivity. By the time the weekend came, the tank was empty.",
				],
				/** Declining, but a big event in the second half explains the drop. */
				decliningEvent: [
					"Things were working until they weren't. Something hit midweek and the rhythm never came back.",
					"The first half was fine. Then the week happened to you and the numbers dropped.",
				],
				rocky: [
					"Good days, bad days, no pattern to it. The week lurched between working and not working.",
					"Some days everything clicked. Other days, nothing. No arc to it, just noise.",
					"The consistency wasn't there. Day to day, it was a coin flip whether things would work.",
				],
			},
		},

		basics: {
			dogGood: [
				"Azor got walked. Every time you tried, it worked. External accountability remains undefeated.",
				"The dog got his walks. That's one thing you can count on\u2014the guilt of a waiting dog is a powerful motivator.",
				"Azor didn't miss a walk. When another creature is depending on you, somehow the buttons work better.",
				"Dog walks: success. Turns out having someone stare at you expectantly is excellent for task completion.",
			],
			dogMixed: [
				"Azor's care was hit and miss. Some days you showed up for him fully. Other days, not so much. He didn't hold it against you.",
				"The dog stuff was... inconsistent. Some tasks done properly, some barely. He's patient like that.",
				"Azor got what he needed, more or less. Not every day, not every task. But enough.",
			],
			dogAfterRecovery: [
				"The walks after the vet were quieter. Slower. You both needed that.",
				"Azor's walks settled into something gentler after the scare. You held the leash a little tighter.",
				"The walks changed after the vet visit. Less routine, more deliberate. You noticed things you usually don't.",
			],
			dogStruggled: [
				"Azor deserved better this week. The walks happened, but barely. A lot of standing outside pretending that counts.",
				"The dog walks were rough. Too many didn't happen. He still loves you, but there was definitely some canine disappointment.",
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

		home: {
			framing: [
				"The apartment had opinions this week.",
				"Meanwhile, the building was doing its own thing.",
				"The apartment didn't make things easier.",
			],
		},

		obligations: {
			framing: [
				"There were things with deadlines. Real ones, not the self-imposed kind.",
				"The outside world made demands this week.",
				"Some things had fixed dates. Those are harder to reschedule than your own tasks.",
			],
		},

		curiosity: {
			creativeUntouched: [
				"The creative stuff sat on your list all week. Untouched. Not even a failed attempt.",
				"You had creative tasks available. You never clicked one. Not once.",
				"The music practice, the project -- they were right there. Seven days of not trying.",
			],
			declinedCookies: [
				"Your neighbor brought cookies. You said no. Sometimes the door is just too far.",
				"Someone baked for you and you turned them down. That's a choice that sits with you.",
			],
			phonePlusFriend: [
				"You checked your phone constantly but also said yes when your friend showed up. Two different kinds of reaching out.",
				"Heavy scrolling, but you accepted the friend rescues. The phone is a habit. The friend is a choice.",
			],
			noFoodAttempts: [
				"You didn't try to eat all week. Not once. The food tasks sat there, untouched. You survived on whatever was already around.",
				"Zero food attempts. The cooking, the ordering -- none of it happened. Eating was ambient at best.",
			],
			dogPerfectRoughWeek: [
				"The dog got walked every time. Everything else fell apart, but Azor got his walks. He doesn't know about the rest.",
				"Rough week, but Azor never missed a walk. External accountability is the one system that doesn't break.",
			],
			variantsHelped: [
				"You lowered the bar a few times this week. The week went well. Maybe that's connected.",
				"The smaller versions of tasks -- you used them, and things worked out. Meeting yourself where you are is a strategy, not a compromise.",
			],
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
