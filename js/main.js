const serviceDialog = document.querySelector("#service-dialog");
const dialogTitle = document.querySelector("#dialog-title");
const dialogContent = document.querySelector("#dialog-content");
const closeDialogButton = document.querySelector(".dialog-close");

const serviceDetails = {
  "home-care": {
    title: "Atendimento a domicílio",
    template: "#home-care-details"
  },
  exams: {
    title: "Exames",
    template: "#exams-details"
  },
  vaccines: {
    title: "Vacinas",
    template: "#vaccines-details"
  }
};

let previouslyFocusedCard = null;
let dialogAnimation = null;
let isClosing = false;

document.querySelectorAll(".service-card").forEach((card) => {
  card.addEventListener("click", () => {
    if (serviceDialog.open) {
      return;
    }

    const details = serviceDetails[card.dataset.service];
    const template = details && document.querySelector(details.template);

    if (!details || !template) {
      throw new Error(`Não foi possível carregar os detalhes do serviço "${card.dataset.service}".`);
    }

    dialogTitle.textContent = details.title;
    dialogContent.replaceChildren(template.content.cloneNode(true));
    previouslyFocusedCard = card;
    serviceDialog.classList.toggle("service-dialog--home-care", card.dataset.service === "home-care");
    document.body.classList.add("modal-open");
    serviceDialog.showModal();
    isClosing = false;
    animateFromCard(card);
    closeDialogButton.focus();
  });
});

function getCardTransform(card) {
  const cardRect = card.getBoundingClientRect();
  const dialogRect = serviceDialog.getBoundingClientRect();
  const offsetX = cardRect.left + cardRect.width / 2 - (dialogRect.left + dialogRect.width / 2);
  const offsetY = cardRect.top + cardRect.height / 2 - (dialogRect.top + dialogRect.height / 2);

  return {
    transform: `translate(${offsetX}px, ${offsetY}px) scale(${cardRect.width / dialogRect.width}, ${cardRect.height / dialogRect.height})`
  };
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function animateFromCard(card) {
  if (prefersReducedMotion()) {
    return;
  }

  const origin = getCardTransform(card);
  dialogAnimation = serviceDialog.animate(
    [
      { ...origin, opacity: 0.72 },
      { transform: "translate(0, 0) scale(1, 1)", opacity: 1 }
    ],
    { duration: 460, easing: "cubic-bezier(.2, .8, .2, 1)" }
  );
}

function closeServiceDialog() {
  if (!serviceDialog.open || isClosing) {
    return;
  }

  if (prefersReducedMotion() || !previouslyFocusedCard?.isConnected) {
    serviceDialog.close();
    return;
  }

  isClosing = true;
  dialogAnimation?.cancel();
  const origin = getCardTransform(previouslyFocusedCard);
  dialogAnimation = serviceDialog.animate(
    [
      { transform: "translate(0, 0) scale(1, 1)", opacity: 1 },
      { ...origin, opacity: 0.72 }
    ],
    { duration: 360, easing: "cubic-bezier(.4, 0, 1, 1)" }
  );
  dialogAnimation.addEventListener("finish", () => {
    if (serviceDialog.open) {
      serviceDialog.close();
    }
  }, { once: true });
}

closeDialogButton.addEventListener("click", () => {
  closeServiceDialog();
});

serviceDialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeServiceDialog();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && serviceDialog.open) {
    event.preventDefault();
    closeServiceDialog();
  }
});

serviceDialog.addEventListener("click", (event) => {
  if (event.target === serviceDialog) {
    closeServiceDialog();
  }
});

serviceDialog.addEventListener("close", () => {
  dialogAnimation?.cancel();
  dialogAnimation = null;
  isClosing = false;
  document.body.classList.remove("modal-open");
  previouslyFocusedCard?.focus();
  previouslyFocusedCard = null;
});
