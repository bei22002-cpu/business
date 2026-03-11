
const currentYear = document.getElementById("current-year");

if (currentYear) {
	currentYear.textContent = String(new Date().getFullYear());
}

const revealItems = document.querySelectorAll(".reveal-on-scroll");
const consultationForm = document.getElementById("consultation-form");
const formStatus = document.getElementById("form-status");
const consultationSubmit = document.getElementById("consultation-submit");
const chatToggle = document.getElementById("chat-toggle");
const chatClose = document.getElementById("chat-close");
const chatPanel = document.getElementById("chat-panel");
const chatMessages = document.getElementById("chat-messages");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const promptButtons = document.querySelectorAll("[data-chat-prompt]");
const siteConfig = window.NORTHSTAR_SITE_CONFIG || {};
const leadSubmissionConfig = {
	endpoint: typeof siteConfig.leadEndpoint === "string" ? siteConfig.leadEndpoint.trim() : "",
	method: typeof siteConfig.leadMethod === "string" ? siteConfig.leadMethod.toUpperCase() : "POST",
	successMessage:
		typeof siteConfig.leadSuccessMessage === "string" && siteConfig.leadSuccessMessage.trim()
			? siteConfig.leadSuccessMessage.trim()
			: "Consultation request submitted. NorthStar should receive it directly.",
	failureMessage:
		typeof siteConfig.leadFailureMessage === "string" && siteConfig.leadFailureMessage.trim()
			? siteConfig.leadFailureMessage.trim()
			: "The submission endpoint did not accept the request. You can try again or email NorthStar directly.",
	fallbackToEmail: siteConfig.fallbackToEmail !== false
};

const consultationFields = {
	name: consultationForm instanceof HTMLFormElement ? consultationForm.elements.namedItem("name") : null,
	email: consultationForm instanceof HTMLFormElement ? consultationForm.elements.namedItem("email") : null,
	company: consultationForm instanceof HTMLFormElement ? consultationForm.elements.namedItem("company") : null,
	need: consultationForm instanceof HTMLFormElement ? consultationForm.elements.namedItem("need") : null,
	context: consultationForm instanceof HTMLFormElement ? consultationForm.elements.namedItem("context") : null
};

const intakeState = {
	active: false,
	stepIndex: 0,
	data: {
		name: "",
		email: "",
		company: "",
		need: "",
		context: ""
	}
};

let chatIntakePrefilled = false;

const intakeSteps = [
	{
		key: "name",
		prompt: "What name should I put on the consultation request?",
		validate: value => (value.length >= 2 ? "" : "Please send the name you want NorthStar to use.")
	},
	{
		key: "email",
		prompt: "What work email should be used?",
		validate: value => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? "" : "Please enter a valid email address.")
	},
	{
		key: "company",
		prompt: "What company is this for? You can type 'skip' if you prefer not to include it.",
		validate: () => ""
	},
	{
		key: "need",
		prompt: "What is the primary need: strategic planning support, operational improvement, execution advisory, or leadership alignment?",
		validate: value => (normalizeNeed(value) ? "" : "Please choose one of these: strategic planning support, operational improvement, execution advisory, or leadership alignment.")
	},
	{
		key: "context",
		prompt: "Briefly describe the situation, where friction is showing up, and the outcome that matters most.",
		validate: value => (value.length >= 12 ? "" : "Please add a little more context so NorthStar has something concrete to review.")
	}
];

const assistantLinks = {
	services: [
		{ label: "View services", href: "#services" },
		{ label: "See results", href: "#results" }
	],
	consultation: [
		{ label: "Open consultation form", href: "#lead-form" },
		{ label: "Email NorthStar", href: "mailto:northstarconsulting@gmail.com" }
	],
	approach: [{ label: "Review approach", href: "#approach" }],
	fit: [{ label: "See best fit", href: "#fit" }],
	contact: [{ label: "Go to contact", href: "#contact" }],
	about: [{ label: "Read about NorthStar", href: "#about" }]
};

const assistantResponses = [
	{
		intent: "greeting",
		matches: ["hello", "hi", "hey", "good morning", "good afternoon"],
		text: "NorthStar helps leaders with strategic planning, operational improvement, and execution advisory. Ask about services, fit, pricing, or how to start an engagement.",
		links: assistantLinks.services
	},
	{
		intent: "services",
		matches: ["service", "services", "offer", "help", "support", "advisory"],
		text: "NorthStar focuses on three areas: strategic planning, operational excellence, and execution advisory. The work is built for leadership teams that need clearer priorities, stronger operating discipline, and visible delivery.",
		links: assistantLinks.services
	},
	{
		intent: "results",
		matches: ["result", "results", "outcome", "impact", "traction"],
		text: "Typical outcomes are better executive alignment, clearer operating visibility, and faster execution across initiatives that are stuck in ambiguity or decision drag.",
		links: [{ label: "View outcomes", href: "#results" }]
	},
	{
		intent: "fit",
		matches: ["fit", "best for", "company", "industry", "startup", "growth", "transformation", "leadership"],
		text: "NorthStar is a strong fit for growth-stage companies, transformation efforts, and leadership transitions where the issue is usually focus, structure, or follow-through rather than effort.",
		links: assistantLinks.fit
	},
	{
		intent: "approach",
		matches: ["approach", "process", "work", "engagement", "start", "how"],
		text: "Engagements usually begin by diagnosing the real constraint, aligning leadership around a credible plan, and then installing the owners, cadence, and visibility needed to execute consistently.",
		links: assistantLinks.approach
	},
	{
		intent: "pricing",
		matches: ["price", "pricing", "cost", "budget", "rate", "fees"],
		text: "The site does not publish fixed pricing because scope depends on the operating context, urgency, and engagement model. The fastest path is a consultation request with a short summary of the challenge.",
		links: assistantLinks.consultation
	},
	{
		intent: "contact",
		matches: ["contact", "email", "call", "talk", "reach", "book", "consultation", "meeting"],
		text: "You can contact NorthStar directly at northstarconsulting@gmail.com or use the consultation form to generate a structured intake email with your situation and primary need.",
		links: assistantLinks.consultation
	},
	{
		intent: "about",
		matches: ["about", "who are you", "who is northstar", "background"],
		text: "NorthStar Consulting is positioned for leaders who need practical traction. The emphasis is on simplifying ambiguity, aligning decisions, and helping teams deliver with confidence.",
		links: assistantLinks.about
	}
];

function setChatOpen(isOpen) {
	if (!(chatToggle instanceof HTMLButtonElement) || !(chatPanel instanceof HTMLElement)) {
		return;
	}

	chatToggle.setAttribute("aria-expanded", String(isOpen));
	chatPanel.hidden = !isOpen;

	if (isOpen && chatInput instanceof HTMLInputElement) {
		chatInput.focus();
	}
}

function normalizeNeed(value) {
	const normalized = value.toLowerCase().trim();

	if (normalized.includes("strateg")) {
		return "Strategic planning support";
	}

	if (normalized.includes("operat")) {
		return "Operational improvement";
	}

	if (normalized.includes("execution") || normalized.includes("deliver")) {
		return "Execution advisory";
	}

	if (normalized.includes("leader") || normalized.includes("align")) {
		return "Leadership alignment";
	}

	return "";
}

function resetIntakeState() {
	intakeState.active = false;
	intakeState.stepIndex = 0;
	intakeState.data = {
		name: "",
		email: "",
		company: "",
		need: "",
		context: ""
	};
}

function setSubmissionState(isSubmitting, message) {
	if (consultationSubmit instanceof HTMLButtonElement) {
		consultationSubmit.disabled = isSubmitting;
		consultationSubmit.textContent = isSubmitting ? "Submitting..." : "Submit consultation request";
	}

	if (formStatus instanceof HTMLElement && message) {
		formStatus.textContent = message;
	}
}

function getLeadPayload(formData) {
	const payload = {
		name: String(formData.get("name") || "").trim(),
		email: String(formData.get("email") || "").trim(),
		company: String(formData.get("company") || "").trim(),
		need: String(formData.get("need") || "").trim(),
		context: String(formData.get("context") || "").trim(),
		source: String(formData.get("source") || "website").trim(),
		submittedAt: new Date().toISOString(),
		chatIntakeUsed: chatIntakePrefilled
	};

	return payload;
}

function openEmailFallback(payload) {
	const subject = encodeURIComponent("NorthStar Consulting Consultation Request");
	const body = encodeURIComponent(
		[
			"Consultation request",
			"",
			`Name: ${payload.name}`,
			`Email: ${payload.email}`,
			`Company: ${payload.company || "Not provided"}`,
			`Primary need: ${payload.need}`,
			"",
			"Context:",
			payload.context
		].join("\n")
	);

	window.location.href = `mailto:northstarconsulting@gmail.com?subject=${subject}&body=${body}`;
}

async function submitLead(payload) {
	if (!leadSubmissionConfig.endpoint) {
		if (leadSubmissionConfig.fallbackToEmail) {
			openEmailFallback(payload);
			return {
				mode: "email-fallback",
				message: "No lead endpoint is configured yet, so the request has been prepared in your email app instead."
			};
		}

		throw new Error("No lead submission endpoint configured.");
	}

	const response = await fetch(leadSubmissionConfig.endpoint, {
		method: leadSubmissionConfig.method,
		headers: {
			"Content-Type": "application/json",
			Accept: "application/json"
		},
		body: JSON.stringify(payload)
	});

	if (!response.ok) {
		throw new Error(`Lead submission failed with status ${response.status}.`);
	}

	return {
		mode: "api",
		message: leadSubmissionConfig.successMessage
	};
}

function updateConsultationFormFromChat() {
	if (!(consultationForm instanceof HTMLFormElement)) {
		return;
	}

	if (consultationFields.name instanceof HTMLInputElement) {
		consultationFields.name.value = intakeState.data.name;
	}

	if (consultationFields.email instanceof HTMLInputElement) {
		consultationFields.email.value = intakeState.data.email;
	}

	if (consultationFields.company instanceof HTMLInputElement) {
		consultationFields.company.value = intakeState.data.company;
	}

	if (consultationFields.need instanceof HTMLSelectElement) {
		consultationFields.need.value = intakeState.data.need;
	}

	if (consultationFields.context instanceof HTMLTextAreaElement) {
		consultationFields.context.value = intakeState.data.context;
	}

	chatIntakePrefilled = true;

	if (formStatus instanceof HTMLElement) {
		formStatus.textContent = "The chatbot prefilled this consultation form. Review the details and submit the request when ready.";
	}
}

function startConsultationIntake() {
	resetIntakeState();
	intakeState.active = true;
	appendChatMessage(
		"assistant",
		"I can collect the consultation details here and prefill the form for you. Type 'cancel' anytime to stop.",
		[{ label: "View form", href: "#lead-form" }]
	);
	appendChatMessage("assistant", intakeSteps[0].prompt);
}

function finishConsultationIntake() {
	updateConsultationFormFromChat();
	appendChatMessage(
		"assistant",
		"The consultation form is now prefilled below. Review it, then use the form button to submit the consultation request.",
		[
			{ label: "Jump to form", href: "#lead-form" },
			{ label: "Email NorthStar", href: "mailto:northstarconsulting@gmail.com" }
		]
	);

	const leadFormSection = document.getElementById("lead-form");
	if (leadFormSection instanceof HTMLElement) {
		leadFormSection.scrollIntoView({ behavior: "smooth", block: "start" });
	}

	resetIntakeState();
}

function handleIntakeAnswer(message) {
	const trimmed = message.trim();

	if (!trimmed) {
		return;
	}

	if (trimmed.toLowerCase() === "cancel") {
		resetIntakeState();
		appendChatMessage("assistant", "Consultation intake cancelled. If you want to restart, click Start intake or ask for a consultation.");
		return;
	}

	const currentStep = intakeSteps[intakeState.stepIndex];
	const error = currentStep.validate(trimmed);

	if (error) {
		appendChatMessage("assistant", error);
		return;
	}

	if (currentStep.key === "company") {
		intakeState.data.company = trimmed.toLowerCase() === "skip" ? "" : trimmed;
	} else if (currentStep.key === "need") {
		intakeState.data.need = normalizeNeed(trimmed);
	} else {
		intakeState.data[currentStep.key] = trimmed;
	}

	intakeState.stepIndex += 1;

	if (intakeState.stepIndex >= intakeSteps.length) {
		finishConsultationIntake();
		return;
	}

	appendChatMessage("assistant", intakeSteps[intakeState.stepIndex].prompt);
}

function appendChatMessage(role, text, links = []) {
	if (!(chatMessages instanceof HTMLElement)) {
		return;
	}

	const wrapper = document.createElement("div");
	wrapper.className = `chatbot-message chatbot-message-${role}`;

	const meta = document.createElement("div");
	meta.className = "chatbot-message-meta";
	meta.textContent = role === "assistant" ? "NorthStar AI" : "You";

	const bubble = document.createElement("div");
	bubble.className = "chatbot-message-bubble";
	bubble.textContent = text;

	wrapper.append(meta, bubble);

	if (links.length > 0) {
		const linksRow = document.createElement("div");
		linksRow.className = "chatbot-message-links";

		links.forEach(link => {
			const anchor = document.createElement("a");
			anchor.href = link.href;
			anchor.textContent = link.label;
			linksRow.appendChild(anchor);
		});

		wrapper.appendChild(linksRow);
	}

	chatMessages.appendChild(wrapper);
	chatMessages.scrollTop = chatMessages.scrollHeight;
}

function findAssistantReply(message) {
	const normalized = message.toLowerCase();

	for (const response of assistantResponses) {
		if (response.matches.some(term => normalized.includes(term))) {
			return response;
		}
	}

	return {
		text: "I can help with services, outcomes, fit, pricing, process, and how to contact NorthStar. If you already know the need, use the consultation form and include the business context.",
		links: assistantLinks.consultation
	};
}

function handleChatPrompt(message) {
	appendChatMessage("user", message);

	if (intakeState.active) {
		handleIntakeAnswer(message);
		return;
	}

	if (message.toLowerCase().includes("start consultation intake") || message.toLowerCase().includes("start intake")) {
		startConsultationIntake();
		return;
	}

	window.setTimeout(() => {
		const reply = findAssistantReply(message);
		appendChatMessage("assistant", reply.text, reply.links || []);

		if (reply.intent === "contact") {
			appendChatMessage("assistant", "If you want, type 'start consultation intake' and I will collect the details here before prefilling the consultation form.", [
				{ label: "Open form", href: "#lead-form" }
			]);
		}
	}, 220);
}

if ("IntersectionObserver" in window && revealItems.length > 0) {
	const observer = new IntersectionObserver(
		entries => {
			entries.forEach(entry => {
				if (entry.isIntersecting) {
					entry.target.classList.add("is-visible");
					observer.unobserve(entry.target);
				}
			});
		},
		{
			threshold: 0.2
		}
	);

	revealItems.forEach(item => observer.observe(item));
} else {
	revealItems.forEach(item => item.classList.add("is-visible"));
}

if (consultationForm instanceof HTMLFormElement && formStatus) {
	consultationForm.addEventListener("submit", async event => {
		event.preventDefault();

		const formData = new FormData(consultationForm);
		if (String(formData.get("website") || "").trim()) {
			setSubmissionState(false, "Submission ignored.");
			return;
		}

		const payload = getLeadPayload(formData);

		setSubmissionState(true, "Submitting your consultation request...");

		try {
			const result = await submitLead(payload);
			setSubmissionState(false, result.message);

			if (result.mode === "api") {
				consultationForm.reset();
				chatIntakePrefilled = false;
				resetIntakeState();
				appendChatMessage(
					"assistant",
					"The consultation request has been submitted. NorthStar should receive the details directly.",
					[{ label: "Back to top", href: "#main" }]
				);
			}
		} catch (error) {
			setSubmissionState(false, leadSubmissionConfig.failureMessage);
			console.error(error);
		}
	});
}

if (chatToggle instanceof HTMLButtonElement) {
	chatToggle.addEventListener("click", () => {
		const isOpen = chatToggle.getAttribute("aria-expanded") === "true";
		setChatOpen(!isOpen);
	});
}

if (chatClose instanceof HTMLButtonElement) {
	chatClose.addEventListener("click", () => setChatOpen(false));
}

document.addEventListener("keydown", event => {
	if (event.key === "Escape") {
		setChatOpen(false);
	}
});

if (chatForm instanceof HTMLFormElement && chatInput instanceof HTMLInputElement) {
	appendChatMessage(
		"assistant",
			"Ask about services, outcomes, pricing, best-fit situations, or how to start. I can also collect consultation details here and prefill the form.",
		assistantLinks.services
	);

	chatForm.addEventListener("submit", event => {
		event.preventDefault();

		const message = chatInput.value.trim();

		if (!message) {
			return;
		}

		handleChatPrompt(message);
		chatForm.reset();
		chatInput.focus();
	});
}

promptButtons.forEach(button => {
	button.addEventListener("click", () => {
		const prompt = button.getAttribute("data-chat-prompt");

		if (!prompt) {
			return;
		}

		setChatOpen(true);
		handleChatPrompt(prompt);
	});
});
