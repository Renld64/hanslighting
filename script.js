// Simple cart + form interactions for Hanslighting demo site

const cartCountEl = document.querySelector(".cart-count");
const cartButton = document.querySelector(".cart-btn");
const cartDialog = document.getElementById("cartDialog");
const cartItemsEl = document.getElementById("cartItems");
const cartSubtotalEl = document.getElementById("cartSubtotal");
const cartActions = document.getElementById("cartActions");
const checkoutForm = document.getElementById("checkoutForm");
const checkoutButton = document.getElementById("checkoutButton");
const cartTitle = document.getElementById("cartTitle");
const toastEl = document.getElementById("toast");
const themeToggle = document.querySelector(".theme-toggle");
const accountButton = document.querySelector(".account-btn");
const accountLabel = document.querySelector(".account-label");
const accountDialog = document.getElementById("accountDialog");
const accountForm = document.getElementById("accountForm");
const accountTitle = document.getElementById("accountTitle");
const accountNameGroup = document.getElementById("accountNameGroup");
const accountNameInput = document.getElementById("accountName");
const accountEmailInput = document.getElementById("accountEmail");
const accountPasswordInput = document.getElementById("accountPassword");
const accountFeedback = document.getElementById("accountFeedback");
const accountSubmit = document.getElementById("accountSubmit");
const accountModeToggle = document.getElementById("accountModeToggle");
const accountLogout = document.getElementById("accountLogout");
const cart = new Map();
const demoAccountStorageKey = "hanslighting-demo-account";
let demoAccount = null;
let signedInUser = null;
let accountMode = "signup";

try {
  const savedDemoAccount = sessionStorage.getItem(demoAccountStorageKey);
  if (savedDemoAccount) {
    const parsedAccount = JSON.parse(savedDemoAccount);
    if (
      typeof parsedAccount.name === "string" &&
      typeof parsedAccount.email === "string" &&
      typeof parsedAccount.password === "string"
    ) {
      demoAccount = parsedAccount;
      accountMode = "login";
    } else {
      sessionStorage.removeItem(demoAccountStorageKey);
    }
  }
} catch (error) {
  console.error("Unable to restore demo account from this browser session.", error);
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const nextTheme = theme === "dark" ? "light" : "dark";
  themeToggle.textContent = nextTheme === "light" ? "☀️" : "🌙";
  themeToggle.setAttribute("aria-label", `Switch to ${nextTheme} theme`);
  themeToggle.title = `Switch to ${nextTheme} theme`;
  localStorage.setItem("theme", theme);
}

if (themeToggle) {
  const savedTheme = localStorage.getItem("theme");
  setTheme(savedTheme === "light" ? "light" : "dark");
  themeToggle.addEventListener("click", () => {
    const currentTheme = document.documentElement.dataset.theme;
    setTheme(currentTheme === "light" ? "dark" : "light");
  });
}

function setAccountFeedback(message, isError = false) {
  accountFeedback.textContent = message;
  accountFeedback.hidden = !message;
  accountFeedback.classList.toggle("is-error", isError);
}

function renderAccountDialog() {
  const signedIn = signedInUser !== null;
  accountForm.hidden = signedIn;
  accountModeToggle.hidden = signedIn;
  accountLogout.hidden = !signedIn;
  accountNameGroup.hidden = accountMode !== "signup";
  accountNameInput.required = accountMode === "signup";
  if (accountMode === "login" && demoAccount && !accountEmailInput.value) {
    accountEmailInput.value = demoAccount.email;
  }
  accountTitle.textContent = signedIn
    ? `Hello, ${signedInUser.name}`
    : accountMode === "signup" ? "Create your account" : "Log in";
  accountSubmit.textContent = accountMode === "signup" ? "Sign Up" : "Log In";
  accountPasswordInput.autocomplete = accountMode === "signup" ? "new-password" : "current-password";
  accountPasswordInput.minLength = accountMode === "signup" ? 8 : 1;
  accountModeToggle.textContent = accountMode === "signup"
    ? "Already signed up? Log in"
    : "New here? Sign up first";
  accountLabel.textContent = signedIn ? signedInUser.name : demoAccount ? "Log In" : "Sign Up";
  accountButton.setAttribute(
    "aria-label",
    signedIn ? `Account for ${signedInUser.name}` : demoAccount ? "Log in to your demo account" : "Sign up or log in"
  );
  renderCart();
}

renderAccountDialog();

function promptAccountForShopping() {
  accountMode = demoAccount === null ? "signup" : "login";
  renderAccountDialog();
  setAccountFeedback("Sign up or log in to add products to your cart.", true);
  accountDialog.showModal();
}

accountButton.addEventListener("click", () => {
  accountMode = signedInUser ? accountMode : demoAccount ? "login" : "signup";
  renderAccountDialog();
  accountDialog.showModal();
});

document.querySelector(".account-close").addEventListener("click", () => accountDialog.close());

accountModeToggle.addEventListener("click", () => {
  accountMode = accountMode === "signup" ? "login" : "signup";
  accountForm.reset();
  setAccountFeedback("");
  renderAccountDialog();
  (accountMode === "signup" ? accountNameInput : accountEmailInput).focus();
});

accountForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!accountForm.reportValidity()) return;

  const email = accountEmailInput.value.trim().toLowerCase();
  const password = accountPasswordInput.value;

  if (accountMode === "signup") {
    if (demoAccount !== null) {
      accountMode = "login";
      accountEmailInput.value = email;
      accountPasswordInput.value = "";
      renderAccountDialog();
      setAccountFeedback("A demo account already exists for this page session. Log in to continue.", true);
      accountPasswordInput.focus();
      return;
    }
    demoAccount = {
      name: accountNameInput.value.trim(),
      email,
      password
    };
    try {
      sessionStorage.setItem(demoAccountStorageKey, JSON.stringify(demoAccount));
    } catch (error) {
      demoAccount = null;
      console.error("Unable to save demo account in this browser session.", error);
      setAccountFeedback("Could not save the demo account in this browser session. Please try again.", true);
      return;
    }
    accountMode = "login";
    accountForm.reset();
    accountEmailInput.value = email;
    renderAccountDialog();
    setAccountFeedback("Sign up complete. Log in with your email and password to continue.");
    accountPasswordInput.focus();
    return;
  }

  if (demoAccount === null) {
    accountMode = "signup";
    renderAccountDialog();
    setAccountFeedback("Sign up first to create your demo account.", true);
    accountNameInput.focus();
    return;
  }

  if (email !== demoAccount.email || password !== demoAccount.password) {
    setAccountFeedback("Email or password is incorrect.", true);
    accountPasswordInput.select();
    return;
  }

  signedInUser = { name: demoAccount.name, email: demoAccount.email };
  setAccountFeedback("");
  renderAccountDialog();
  showToast(`Welcome, ${signedInUser.name}!`);
});

accountLogout.addEventListener("click", () => {
  signedInUser = null;
  accountMode = "login";
  cart.clear();
  renderCart();
  accountForm.reset();
  renderAccountDialog();
  setAccountFeedback("You are logged out.");
  accountEmailInput.focus();
});

function renderCart() {
  const items = [...cart.values()];
  const itemCount = items.reduce((total, item) => total + item.quantity, 0);
  cartButton.hidden = signedInUser === null;
  cartCountEl.textContent = itemCount;
  cartButton.setAttribute("aria-label", `Cart, ${itemCount} item${itemCount === 1 ? "" : "s"}`);
  cartItemsEl.replaceChildren();

  if (items.length === 0) {
    const emptyMessage = document.createElement("p");
    emptyMessage.className = "cart-empty";
    emptyMessage.textContent = "Your cart is empty.";
    cartItemsEl.append(emptyMessage);
  }

  items.forEach((item) => {
    const row = document.createElement("div");
    row.className = "cart-item";

    const details = document.createElement("div");
    details.className = "cart-item-details";
    const name = document.createElement("strong");
    name.textContent = item.name;
    const price = document.createElement("span");
    price.textContent = `$${item.price.toFixed(2)} each`;
    details.append(name, price);

    const controls = document.createElement("div");
    controls.className = "cart-item-controls";
    const quantity = document.createElement("span");
    quantity.textContent = `Qty: ${item.quantity}`;
    const decrease = document.createElement("button");
    decrease.type = "button";
    decrease.className = "btn btn-sm btn-outline";
    decrease.textContent = "−";
    decrease.setAttribute("aria-label", `Remove one ${item.name}`);
    decrease.addEventListener("click", () => updateCartQuantity(item.id, -1));
    const increase = document.createElement("button");
    increase.type = "button";
    increase.className = "btn btn-sm btn-outline";
    increase.textContent = "+";
    increase.setAttribute("aria-label", `Add one ${item.name}`);
    increase.addEventListener("click", () => updateCartQuantity(item.id, 1));
    controls.append(quantity, decrease, increase);

    const lineTotal = document.createElement("strong");
    lineTotal.className = "cart-line-total";
    lineTotal.textContent = `$${(item.price * item.quantity).toFixed(2)}`;
    row.append(details, controls, lineTotal);
    cartItemsEl.append(row);
  });

  const subtotal = items.reduce((total, item) => total + item.price * item.quantity, 0);
  cartSubtotalEl.textContent = `$${subtotal.toFixed(2)}`;
  cartActions.hidden = itemCount === 0;
  checkoutButton.disabled = itemCount === 0;
}

function updateCartQuantity(id, amount) {
  const item = cart.get(id);
  if (!item) return;
  item.quantity += amount;
  if (item.quantity <= 0) {
    cart.delete(id);
  }
  renderCart();
}

renderCart();

document.querySelector(".cart-close").addEventListener("click", () => cartDialog.close());
cartButton.addEventListener("click", () => {
  if (signedInUser === null) {
    promptAccountForShopping();
    return;
  }
  cartDialog.showModal();
});
checkoutButton.addEventListener("click", () => {
  if (signedInUser === null || cart.size === 0) return;
  cartDialog.classList.add("checkout-mode");
  cartActions.hidden = true;
  checkoutForm.hidden = false;
  cartTitle.textContent = "Checkout";
  document.getElementById("checkoutName").focus();
});

document.getElementById("backToCart").addEventListener("click", () => {
  cartDialog.classList.remove("checkout-mode");
  checkoutForm.hidden = true;
  cartActions.hidden = cart.size === 0;
  cartTitle.textContent = "Your Cart";
});

checkoutForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (signedInUser === null || !checkoutForm.reportValidity() || cart.size === 0) return;
  const customerName = document.getElementById("checkoutName").value.trim();
  cart.clear();
  renderCart();
  checkoutForm.reset();
  cartDialog.classList.remove("checkout-mode");
  checkoutForm.hidden = true;
  cartTitle.textContent = "Your Cart";
  cartDialog.close();
  showToast(`Thanks, ${customerName}! Demo order placed; no payment was processed.`);
});

cartDialog.addEventListener("close", () => {
  cartDialog.classList.remove("checkout-mode");
  checkoutForm.hidden = true;
  cartActions.hidden = cart.size === 0;
  cartTitle.textContent = "Your Cart";
});

// Add selected product quantities to the cart.
document.querySelectorAll(".add-to-cart").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (signedInUser === null) {
      promptAccountForShopping();
      return;
    }
    const card = btn.closest(".product-card");
    const qtySelect = card.querySelector(".qty-select");
    const id = card.dataset.id;
    const qty = Number.parseInt(qtySelect.value, 10);
    const name = card.querySelector("h3").textContent;
    const price = Number.parseFloat(card.querySelector(".price").textContent.replace("$", ""));
    const existing = cart.get(id);
    if (existing) {
      existing.quantity += qty;
    } else {
      cart.set(id, { id, name, price, quantity: qty });
    }
    renderCart();
    showToast(`Added ${qty} item${qty > 1 ? "s" : ""} to cart`);
  });
});

function showToast(message) {
  toastEl.textContent = message;
  toastEl.hidden = false;
  // force reflow so transition works
  void toastEl.offsetWidth;
  toastEl.classList.add("show");
  setTimeout(() => {
    toastEl.classList.remove("show");
    setTimeout(() => {
      toastEl.hidden = true;
    }, 300);
  }, 2200);
}

// Contact form
const contactForm = document.getElementById("contactForm");
if (contactForm) {
  contactForm.addEventListener("submit", (e) => {
    e.preventDefault();
    showToast("Message sent! We'll get back to you soon.");
    contactForm.reset();
  });
}

// Mobile menu (simple toggle for nav)
const mobileBtn = document.querySelector(".mobile-menu-btn");
const nav = document.querySelector(".nav");

if (mobileBtn && nav) {
  mobileBtn.addEventListener("click", () => {
    nav.classList.toggle("mobile-open");
  });
}