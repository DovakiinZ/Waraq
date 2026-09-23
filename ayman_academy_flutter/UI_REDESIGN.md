# UI Redesign Documentation — iOS Premium + Udemy-Inspired

> Completed: 2026-04-10
> Style: iOS-heavy, premium, bold typography, Udemy-inspired layout

---

## Design Philosophy

- **iOS-first feel** — Clean white backgrounds, thin separators, system colors, no visual clutter
- **Bold typography** — Heavy headings (w800), clear hierarchy, large titles
- **Content-first** — Large images, prominent text, minimal decoration
- **No shadows** — Flat design with thin 0.5px borders or dividers for separation
- **Udemy patterns** — Star ratings, bestseller badges, horizontal course carousels, sticky CTAs

---

## Color Palette Changes

| Token | Before | After | Purpose |
|-------|--------|-------|---------|
| `primary` | `#1E3A5F` (navy) | `#1A1A1A` (near-black) | Primary text/buttons — iOS premium |
| `accent` | N/A | `#5856D6` (iOS purple) | Active states, progress, highlights |
| `accentLight` | N/A | `#7B79E8` | Dark mode accent variant |
| `background` | `#F7F4EF` (warm ivory) | `#FFFFFF` (pure white) | Clean white background |
| `surface` | `#FAF8F5` | `#FFFFFF` | Pure white surfaces |
| `secondary` | `#EEEAE2` | `#F5F5F5` | Neutral light gray for fills |
| `border` | `#DDD8CE` (warm) | `#E5E5EA` (iOS gray 5) | iOS system separator |
| `ink` | `#1A2233` | `#000000` | Pure black text |
| `inkMuted` | `#6B7280` | `#8E8E93` | iOS system gray |
| `backgroundDark` | `#131921` | `#000000` | True black (OLED) |
| `surfaceDark` | `#1A2332` | `#1C1C1E` | iOS dark surface |
| `success` | `#22C55E` | `#34C759` | iOS system green |
| `error` | `#EF4444` | `#FF3B30` | iOS system red |
| `warning` | `#F59E0B` | `#FF9500` | iOS system orange |
| `info` | `#3B82F6` | `#007AFF` | iOS system blue |
| `starYellow` | N/A | `#F4C150` | Star rating gold |
| `starFilled` | N/A | `#E59819` | Filled star darker gold |
| `bestsellerBg` | N/A | `#ECEB98` | Udemy bestseller badge bg |
| `bestsellerText` | N/A | `#3D3C0A` | Udemy bestseller badge text |

---

## Typography Scale (iOS-inspired)

| Style | Size | Weight | Usage |
|-------|------|--------|-------|
| `displayLarge` | 34px | w800 | Hero headings |
| `displayMedium` | 28px | w700 | Page titles |
| `displaySmall` | 22px | w700 | Section titles |
| `headlineLarge` | 20px | w700 | Sub-section titles |
| `headlineMedium` | 17px | w600 | Bold body text |
| `bodyLarge` | 17px | w400 | Body text |
| `bodyMedium` | 15px | w400 | Callout text |
| `bodySmall` | 13px | w400 | Subhead |
| `labelLarge` | 13px | w600 | Footnote bold |
| `labelMedium` | 12px | w500 | Caption 1 |
| `labelSmall` | 11px | w500 | Caption 2 |

---

## Component Changes

### Buttons
- **Before**: Gradient backgrounds, box shadows, 12px radius
- **After**: Solid color, no elevation, 8px radius, 50px min height, full-width, w700 text
- Outlined variant added for secondary actions

### Cards
- **Before**: 12px radius, border + shadow, colored borders
- **After**: 12px radius, no border, no shadow, no elevation, zero margin

### Inputs
- **Before**: 8px radius, outlined with border, white fill
- **After**: 12px radius, filled with `#F5F5F5`, no border default, accent border on focus

### Navigation Bar (Bottom)
- **Before**: Material 3 with pill indicator, 12px label
- **After**: No indicator, 10px label, thin top border, 56px height, clean icon/label style

### Dividers
- **Before**: Default Material dividers
- **After**: 0.5px thin, iOS-style separator color

### Chips
- **Before**: N/A
- **After**: Pill-shaped (20px radius), secondary bg, no border, horizontal scrollable

---

## New Shared Widgets Created

### `shared/widgets/star_rating.dart`
- Row of 5 star icons (filled/half/empty) with rating number + count
- Compact variant for cards (smaller text/icons)
- Gold stars using `AppColors.starFilled`

### `shared/widgets/bestseller_badge.dart`
- Udemy-style yellow pill badge
- Bilingual: "الأكثر مبيعاً" / "Bestseller"
- Yellow-green background (`#ECEB98`) with dark text

---

## Screen-by-Screen Changes

### Auth Screens

#### Login Screen
- **Before**: Navy-to-ivory gradient background, circle logo with shadow, card with shadow, gradient button
- **After**: Clean white background, large bold title "Waraq Academy" left-aligned, labels above inputs, solid button, "or" divider with outlined register button, language toggle at bottom

#### Register Screen
- **Before**: Basic AppBar, generic form layout, icon-prefixed inputs
- **After**: iOS back button, bold title "Create account" with subtitle, labeled inputs (no prefixes), clean error display, success state with green circle check

### Student Screens

#### Student Dashboard
- **Before**: Gradient greeting header, colored quick-action chips, shadowed carousels
- **After**: Clean welcome text ("What do you want to learn today?"), horizontal scrollable pill chips for quick actions, SubjectCard carousels, search + avatar in AppBar

#### My Subjects
- **Before**: Cards with gradient icon boxes and shadows
- **After**: Flat list with thumbnails (60x60), bold titles, thin progress bars, divider-separated

#### Subject Detail
- **Before**: Hero with gradient overlay, stat pills, shadowed lesson cards
- **After**: Clean hero image, bold title + star rating + enrollment count, expandable Udemy-style curriculum sections, numbered lesson items with thin dividers, sticky bottom CTA

#### Discover
- **Before**: 2-column grid of SubjectCards
- **After**: Single-column list of redesigned SubjectCards (larger, more info)

#### Marketplace
- **Before**: 2-column grid
- **After**: Single-column list, same as Discover

#### Checkout
- **Before**: Card-based sections with shadows
- **After**: Clean sections with thin dividers, sticky bottom CTA

#### Lesson Player
- **Before**: Heavy progress bar, action icons in AppBar
- **After**: 2px thin accent progress bar, iOS-style bottom action bar for notes/comments/rating

#### Certificates
- **Before**: Cards with icon circles and shadows
- **After**: Flat list with dividers, status icon circles (48px), accent/warning colored badges

#### Messages
- **Before**: ListTile-based with primary-colored unread badges
- **After**: Clean contact list, accent-colored unread circles, thin dividers

#### Student Profile
- **Before**: Card-based settings, gradient stage display
- **After**: iOS-grouped-settings pattern, large avatar, sections with dividers, Switch.adaptive toggles

#### Quiz
- **Before**: Basic option containers, primary colors
- **After**: Clean 1px bordered options, accent when selected, custom radio circles, large score circle on results

### Teacher Screens

#### Teacher Dashboard
- **Before**: Gradient header, stat cards with colored backgrounds
- **After**: Clean bold welcome, flat stat containers with thin borders, horizontal action chips

#### Teacher Orders
- **Before**: Cards with status badges and shadows
- **After**: Flat list with dividers, accent confirm / error reject buttons

#### Teacher Profile
- **Before**: Simple form layout
- **After**: iOS-grouped-settings pattern (same as student), avatar with initial, modal editing

### Navigation Shells

#### Student Shell
- **Before**: Material NavigationBar with indicator pill, colored drawer header
- **After**: Clean bottom nav with thin top border, no indicator, rounded icons, horizontal drawer profile header

#### Teacher Shell
- Same changes as Student Shell

---

## Model Changes

### Subject Model (`shared/models/subject.dart`)
Added fields:
- `averageRating` (`double?`) — Average star rating
- `ratingCount` (`int?`) — Number of ratings
- `enrollmentCount` (`int?`) — Number of enrolled students

These are parsed from `fromJson` if available from the API. The SubjectCard uses fallback values if null.

---

## Files Modified

### Foundation (2 files)
- `lib/core/theme/app_colors.dart` — Complete palette overhaul
- `lib/core/theme/app_theme.dart` — Full theme rewrite with typography, components, dark mode

### New Widgets (2 files)
- `lib/shared/widgets/star_rating.dart` — NEW
- `lib/shared/widgets/bestseller_badge.dart` — NEW

### Shared (3 files)
- `lib/shared/widgets/subject_card.dart` — Redesigned
- `lib/shared/widgets/shells/student_shell.dart` — Redesigned
- `lib/shared/widgets/shells/teacher_shell.dart` — Redesigned

### Model (1 file)
- `lib/shared/models/subject.dart` — Added rating/enrollment fields

### Auth (2 files)
- `lib/features/auth/screens/login_screen.dart` — Redesigned
- `lib/features/auth/screens/register_screen.dart` — Redesigned

### Student Screens (10 files)
- `lib/features/student/dashboard/screens/student_dashboard_screen.dart` — Redesigned
- `lib/features/student/subjects/screens/my_subjects_screen.dart` — Redesigned
- `lib/features/student/subjects/screens/subject_detail_screen.dart` — Redesigned
- `lib/features/student/subjects/screens/discover_screen.dart` — Redesigned
- `lib/features/student/marketplace/screens/marketplace_screen.dart` — Redesigned
- `lib/features/student/marketplace/screens/checkout_screen.dart` — Redesigned
- `lib/features/student/lessons/screens/lesson_player_screen.dart` — Redesigned
- `lib/features/student/certificates/screens/my_certificates_screen.dart` — Redesigned
- `lib/features/student/messages/screens/messages_contacts_screen.dart` — Redesigned
- `lib/features/student/profile/screens/student_profile_screen.dart` — Redesigned
- `lib/features/student/quiz/screens/quiz_screen.dart` — Redesigned

### Teacher Screens (3 files)
- `lib/features/teacher/dashboard/screens/teacher_dashboard_screen.dart` — Redesigned
- `lib/features/teacher/orders/screens/teacher_orders_screen.dart` — Redesigned
- `lib/features/teacher/profile/screens/teacher_profile_screen.dart` — Redesigned

**Total: 24 files modified/created**
