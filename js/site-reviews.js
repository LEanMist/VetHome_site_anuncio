const siteReviewsUrl = "https://idbmkgcwlspixrrefzpi.supabase.co";
const siteReviewsKey = "sb_publishable_haj88NaOg-gk-1TJgAT7EQ_AojgoH8y";
const reviewsList = document.querySelector("#site-reviews-list");
const reviewsStatus = document.querySelector("#site-reviews-status");
const reviewsScore = document.querySelector("#site-reviews-score");
const reviewsForm = document.querySelector("#site-review-form");
const formStatus = document.querySelector("#site-review-form-status");
const moreButton = document.querySelector("#site-reviews-more");
const allReviews = reviewsList.hasAttribute("data-all-reviews");
const storageKey = "vethome-review-keys";
const pageSize = 24;
let visibleCount = allReviews ? pageSize : 3;
let refreshVersion = 0;
let realtimeAvailable = null;

function updateCombinedRating(summary) {
  const ratingElement = document.querySelector("#combined-rating");
  if (!ratingElement) return;
  const countElement = document.querySelector("#combined-review-count");
  const starsElement = document.querySelector("#combined-stars");
  const statusElement = document.querySelector("#combined-rating-status");
  if (!summary) {
    ratingElement.textContent = "—";
    countElement.textContent = "—";
    starsElement.hidden = true;
    statusElement.textContent = "Média geral indisponível. Não foi possível atualizar as avaliações do site.";
    return;
  }

  const sources = [...document.querySelectorAll(".review-platform")].map((platform) => ({
    rating: Number(platform.dataset.rating),
    count: Number(platform.dataset.count)
  }));
  const siteCount = Number(summary.review_count);
  const siteAverage = siteCount ? Number(summary.average_rating) : 0;
  if (!sources.length || sources.some(({ rating, count }) => (
    !Number.isFinite(rating) || rating < 0 || rating > 5 || !Number.isInteger(count) || count < 1
  )) || summary.review_count == null || !Number.isSafeInteger(siteCount) || siteCount < 0 || (siteCount > 0 && (
    summary.average_rating === null || !Number.isFinite(siteAverage) || siteAverage < 1 || siteAverage > 5
  ))) {
    throw new Error("Os dados para a média geral são inválidos.");
  }
  const count = sources.reduce((total, source) => total + source.count, siteCount);
  const total = sources.reduce((sum, source) => sum + source.rating * source.count, siteAverage * siteCount);
  const average = total / count;
  ratingElement.textContent = average.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  countElement.textContent = count.toLocaleString("pt-BR");
  const filledStars = Math.round(average);
  starsElement.textContent = "★".repeat(filledStars) + "☆".repeat(5 - filledStars);
  starsElement.hidden = false;
  statusElement.textContent = "";
}

function showStatus(element, message) {
  element.textContent = message;
}

function readKeys() {
  const saved = localStorage.getItem(storageKey);
  if (!saved) return {};
  const keys = JSON.parse(saved);
  if (!keys || typeof keys !== "object" || Array.isArray(keys)) {
    throw new Error("As chaves das avaliações não puderam ser lidas.");
  }
  return keys;
}

function saveKeys(keys) {
  localStorage.setItem(storageKey, JSON.stringify(keys));
}

function createSecret() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function renderReview(review, keys, client) {
  const card = document.createElement("article");
  card.className = "review-card";
  const top = document.createElement("div");
  top.className = "review-card-top";
  const name = document.createElement("strong");
  name.textContent = review.name;
  const stars = document.createElement("span");
  stars.className = "review-stars";
  stars.textContent = "★".repeat(review.rating) + "☆".repeat(5 - review.rating);
  stars.setAttribute("aria-label", `${review.rating} de 5 estrelas`);
  top.append(name, stars);
  const comment = document.createElement("p");
  comment.className = "review-summary site-review-comment";
  comment.textContent = review.comment;
  const date = document.createElement("span");
  date.className = "review-card-source";
  date.textContent = `Vet Home · ${new Date(review.created_at).toLocaleDateString("pt-BR")}`;
  card.append(top, comment, date);

  if (typeof keys[review.id] === "string") {
    const button = document.createElement("button");
    button.className = "site-review-delete";
    button.type = "button";
    button.textContent = "Excluir minha avaliação";
    button.addEventListener("click", async () => {
      if (!window.confirm("Deseja excluir sua avaliação?")) return;
      button.disabled = true;
      showStatus(reviewsStatus, "");
      try {
        const currentKeys = readKeys();
        const { data, error } = await client.rpc("delete_site_review", {
          review_id: review.id,
          delete_secret: currentKeys[review.id]
        });
        if (error) throw error;
        if (!data) throw new Error("A chave de exclusão não foi aceita ou a avaliação já foi excluída.");
        delete currentKeys[review.id];
        saveKeys(currentKeys);
        if (await refreshReviews(client)) showStatus(reviewsStatus, "Avaliação excluída.");
      } catch (error) {
        console.error("Erro ao excluir avaliação:", error);
        showStatus(reviewsStatus, "Não foi possível excluir a avaliação. Confira sua conexão e tente novamente.");
        button.disabled = false;
      }
    });
    card.append(button);
  }
  return card;
}

async function refreshReviews(client) {
  const version = ++refreshVersion;
  try {
    const keys = readKeys();
    const { data: summary, error: summaryError } = await client.rpc("site_reviews_summary").single();
    if (summaryError) throw summaryError;
    const reviews = [];
    for (let offset = 0; offset < visibleCount; offset += pageSize) {
      const end = Math.min(offset + pageSize, visibleCount) - 1;
      const { data, error } = await client.from("site_reviews")
        .select("id,name,rating,comment,created_at")
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(offset, end);
      if (error) throw error;
      reviews.push(...data);
      if (data.length < end - offset + 1) break;
    }
    if (version !== refreshVersion) return false;
    updateCombinedRating(summary);
    const count = Number(summary.review_count);
    if (count) {
      const rating = document.createElement("strong");
      rating.textContent = `${Number(summary.average_rating).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} de 5`;
      reviewsScore.replaceChildren("Nota do site: ", rating, ` · ${count.toLocaleString("pt-BR")} ${count === 1 ? "avaliação" : "avaliações"}`);
    } else {
      reviewsScore.textContent = "Ainda não há avaliações no site.";
    }
    reviewsList.replaceChildren(...reviews.map((review) => renderReview(review, keys, client)));
    if (moreButton) moreButton.hidden = reviews.length >= count;
    showStatus(reviewsStatus, realtimeAvailable === false ? "Atualização automática em tempo real indisponível. As avaliações serão verificadas periodicamente." : "");
    return true;
  } catch (error) {
    if (version !== refreshVersion) return false;
    console.error("Erro ao carregar avaliações:", error);
    updateCombinedRating(null);
    reviewsScore.textContent = "Nota do site indisponível.";
    showStatus(reviewsStatus, "Não foi possível carregar as avaliações. Confira sua conexão e tente novamente.");
    return false;
  }
}

if (!window.supabase) {
  updateCombinedRating(null);
  reviewsScore.textContent = "Nota do site indisponível.";
  showStatus(reviewsStatus, "Não foi possível carregar o serviço de avaliações. Confira sua conexão e recarregue a página.");
  if (reviewsForm) reviewsForm.querySelector("button[type=submit]").disabled = true;
} else {
  const client = window.supabase.createClient(siteReviewsUrl, siteReviewsKey);

  if (reviewsForm) {
    reviewsForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const button = reviewsForm.querySelector("button[type=submit]");
      const data = new FormData(reviewsForm);
      const name = data.get("name").trim();
      const comment = data.get("comment").trim();
      const rating = Number(data.get("rating"));
      if (!name || !Number.isInteger(rating) || rating < 1 || rating > 5) {
        showStatus(formStatus, "Preencha o nome e escolha de 1 a 5 estrelas.");
        return;
      }
      button.disabled = true;
      showStatus(formStatus, "Enviando avaliação...");
      try {
        const id = crypto.randomUUID();
        const secret = createSecret();
        const keys = readKeys();
        keys[id] = secret;
        saveKeys(keys);
        const { error } = await client.rpc("create_site_review", {
          review_id: id,
          review_name: name,
          review_rating: rating,
          review_comment: comment,
          delete_secret: secret
        });
        if (error) throw error;
        reviewsForm.reset();
        showStatus(formStatus, "Avaliação enviada! Você pode excluí-la neste navegador.");
        await refreshReviews(client);
      } catch (error) {
        console.error("Erro ao enviar avaliação:", error);
        showStatus(formStatus, "Não foi possível confirmar o envio. Confira sua conexão e os dados do navegador antes de tentar novamente.");
      } finally {
        button.disabled = false;
      }
    });
  }

  if (moreButton) {
    moreButton.addEventListener("click", async () => {
      moreButton.disabled = true;
      visibleCount += pageSize;
      await refreshReviews(client);
      moreButton.disabled = false;
    });
  }

  client.channel("site-reviews-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "site_reviews" }, () => refreshReviews(client))
    .subscribe((status) => {
      realtimeAvailable = status === "SUBSCRIBED";
      if (status === "SUBSCRIBED" || status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        refreshReviews(client);
      }
    });
  refreshReviews(client);
  setInterval(() => {
    if (!document.hidden) refreshReviews(client);
  }, 30000);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) refreshReviews(client);
  });
}
