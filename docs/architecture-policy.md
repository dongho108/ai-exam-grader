# Architecture & Technical Policy: AI Exam Grader

## 1. Technology Stack

### Core Framework
*   **Next.js 15+ (App Router)**: 최신 React Server Components(RSC) 아키텍처 활용
*   **React 19**: Server Actions, `useOptimistic`, `useFormStatus` 등 최신 훅 사용
*   **TypeScript**: Strict Mode 적용, `any` 사용 지양

### Styling
*   **Tailwind CSS v4**: Zero-runtime CSS-in-JS
*   **Utillity**: `clsx`, `tailwind-merge`를 사용한 조건부 스타일링 관리
*   **Design System**: `docs/ui-ux-guide.md`에 정의된 컬러 및 폰트 변수 사용

### State Management
*   **Server State**: RSC 및 Server Actions를 통한 데이터 Fetching/Mutation (별도 라이브러리 최소화)
*   **Client State**:
    *   **Local UI State**: `useState`, `useReducer`
    *   **Complex File Management**: 대량의 PDF 파일 상태 관리 필요 시 `Zustand` 도입 고려 (Stage 1에서는 React Context 또는 State로 충분할 수 있음)

### PDF & Graphics
*   **PDF Rendering**: `react-pdf` (Browser-side rendering)
*   **Overlay Graphics**: HTML/CSS Overlay 또는 Canvas API

---

## 2. Project Architecture

### Directory Structure
Feature-based 구조를 지향하여, 기능 단위로 응집도를 높입니다.

```
/
├── app/                    # Next.js App Router (Routing & Layouts)
│   ├── layout.tsx          # Root Layout (Font, Global Providers)
│   ├── page.tsx            # Home Page
│   ├── globals.css         # Global Styles & Tailwind Directives
│   └── (routes)/           # Route Groups
│       ├── editor/         # [Feature] Exam Grader Workspace
│       └── dashboard/      # [Feature] Dashboard (Future)
├── components/             # Shared UI Components (Atomic)
│   ├── ui/                 # Buttons, Inputs, Cards (Design System)
│   ├── layout/             # Header, Sidebar, Footer
│   └── icons/              # SVG Icons
├── features/               # Feature-specific Business Logic & UI
│   ├── grader/             # [Domain] Exam Grading Logic
│   │   ├── components/     # Grader-specific UI (PDFViewer, ScorePanel)
│   │   ├── hooks/          # Grader-specific Logic (usePDFNav, useScore)
│   │   └── types.ts        # Grader-specific Types
│   └── upload/             # [Domain] File Upload Logic
├── lib/                    # Utility Functions
│   ├── utils.ts            # Classname merger, formatters
│   └── pdf-helper.ts       # PDF manipulation helpers
└── types/                  # Global Type Definitions
```

---

## 3. Development Policy & Patterns

### 3.1. Server Components vs Client Components
*   **Default to Server**: 모든 페이지와 컴포넌트는 기본적으로 **Server Component**로 작성합니다.
*   **'use client' Usage**:
    *   `useState`, `useEffect` 등 React Hook이 필요한 경우
    *   `onClick` 등 이벤트 리스너가 필요한 경우
    *   Browser API (window, document) 접근이 필요한 경우 (PDF 렌더링 등)
*   **Boundary Separation**: Client Component는 트리의 말단(Leaf)으로 밀어넣어 서버 렌더링 이점을 유지합니다.

### 3.2. Data Fetching & Caching
*   **Fetching**: Server Component에서 `await fetch()` 또는 DB 호출 직접 수행
*   **Caching**: Next.js 기본 캐싱 정책(`force-cache`) 활용, 필요 시 `revalidatePath`로 갱신
*   **Streaming**: 대용량 데이터나 PDF 처리가 오래 걸릴 경우 `Suspense`와 `loading.tsx`를 적극 활용하여 UX 개선

### 3.3. Coding Standards
*   **Naming Convention**:
    *   File: `kebab-case.tsx` (e.g., `user-profile.tsx`)
    *   Component: `PascalCase` (e.g., `UserProfile`)
    *   Function/Variable: `camelCase`
*   **Exports**: Named Export 선호 (`export function Button() {}`)
*   **Imports**: Absolute Import 사용 (`@/components/...`)

### 3.4. Stage 1 (Standalone) Implementation Strategy
백엔드 없이 동작해야 하므로, **Mock Service Worker (MSW)**나 **Browser LocalStorage**를 활용하지 않고,
단순히 **Client Memory State**를 사용하여 세션이 유지되는 동안만 데이터를 관리합니다.
(새로고침 시 데이터 초기화는 Stage 1 스펙상 허용)

---

## 4. UI/UX Guidelines (Implementation)
*   **Responsive**: Mobile First보다는 **Desktop First** (업무용 툴 특성상 데스크탑 뷰가 메인)
*   **Feedback**: 파일 업로드, 채점 진행 시 반드시 **Loading UI** 또는 **Toast Message** 제공
*   **Accessibility**: 버튼에 `aria-label`, 이미지에 `alt` 속성 필수

