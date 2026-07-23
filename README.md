# YAPSAT - Handmade Marketplace Platform

YAPSAT is a modern, elegant, and fully responsive multi-vendor e-commerce platform dedicated to selling handmade crafts and unique design goods.

---

## 🚀 Tech Stack

### Backend
*   **Language & Framework:** Python 3.12, FastAPI
*   **Database & ORM:** SQLAlchemy 2.x, SQLite (managed via Alembic Migrations)
*   **Authentication:** JWT (JSON Web Tokens) for secure session management
*   **Image Storage:** Cloudinary integration for media assets

### Frontend
*   **Framework & Language:** React 19, TypeScript
*   **Build Tool:** Vite
*   **Styling:** Tailwind CSS (featuring a modern Glassmorphism navbar, smooth transitions, and micro-animations)

---

## 💡 Key Features & Functions

1.  **Advanced & Mobile-Responsive Navbar:**
    *   Responsive hamburger navigation menu for mobile devices.
    *   Elegant initials-based avatar indicator for authenticated users.
    *   Dynamic links pointing to Admin and Vendor dashboards based on user roles.
2.  **Auto Admin Promotion:**
    *   Upon application startup, the user with the email address `arda.demirtas2002@gmail.com` is automatically promoted to the highest privilege level "ADMIN".
3.  **Smart Category Startup Seeding:**
    *   If no categories exist in the database, the server automatically seeds 10 popular default categories (Electronics, Home & Living, Clothing & Accessories, Cosmetics, Sports & Outdoor, Mother & Baby, Books & Hobbies, Supermarket & Food, Automotive, Pet Shop) on startup.
4.  **Interactive Product Image Carousel:**
    *   Product detail pages include left/right navigation arrow overlays, progress indicator dots, and a synchronized thumbnail previews grid.
5.  **Automated SEO Optimization:**
    *   When a product is created or updated, `seo_title` (`[Product Name] - [Category] | YAPSAT`) and `seo_description` (first 150 characters of description) are automatically generated on the backend.
6.  **Automatic SKU (Stock Keeping Unit) Generation:**
    *   Manual SKU inputs are removed from creation forms. The server automatically assigns a unique stock code formatted as `YS-[8-DIGIT RANDOM ALPHANUMERIC SUFFIX]` (e.g., `YS-8B7D2W3Q`).
7.  **Handmade Brand Toggle Checkbox:**
    *   Checking the "Handmade" box next to the Brand input automatically auto-populates and locks the Brand field value to "El Yapımı" to prevent typos.
8.  **Multi-Image Uploads:**
    *   Creation modals support batch file selection, drag-and-drop actions, and immediate thumbnail previews grid before submission.
9.  **Advanced Help Guidelines Drawer:**
    *   Admin and Vendor dashboards include an interactive guidelines drawer providing helpful operational instructions.

---

## 📸 Screenshots

Below are screenshots showing YAPSAT's page layouts and user flows:

### 🔑 Authentication Flows
| Register Page | Login Page |
|:---:|:---:|
| ![Register](photos/signup.png) | ![Login](photos/login.png) |

### 🛍️ Shopping & Cart Flows
| Product Detail (Interactive Carousel) | Shopping Cart |
|:---:|:---:|
| ![Product Detail](photos/urun_incele.png) | ![Cart](photos/sepet.png) |

### 💼 Admin & Vendor Dashboards
| Admin Product Management Panel | Vendor & Store Dashboard |
|:---:|:---:|
| ![Admin Panel](photos/adminpanel.png) | ![Vendor Panel](photos/dash.png) |

---

## 🛠️ Installation & Running

### Prerequisites
*   Node.js (v18+)
*   Python (v3.12+)

### 1. Backend Installation
```bash
cd backend
# Create and activate a virtual environment
python -m venv .venv
.venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Start development server
python -m uvicorn app.main:app --reload --port 8000
```

### 2. Frontend Installation
```bash
cd frontend
# Install dependencies
npm install

# Start React dev server
npm run dev
```

---

## 📐 Architecture (Backend Layers)

The project is structured according to Layered Architecture principles:
```
API (Routes) ➔ Service (Business Logic) ➔ Repository (DB Queries) ➔ Database (Models)
```
*   **API Layer:** Validates incoming requests and returns consistent response payloads. Contains no business logic.
*   **Service Layer:** Implements business rules (validations, stock reservations, coupon checks).
*   **Repository Layer:** Abstract database read/write queries.
