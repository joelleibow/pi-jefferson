# Research: Cell Widths

Date: 2026-11-07  
Research seat: Chidi (documentation, API, and platform behavior)

## Scope and Question

The brief asks for prior art and platform facts for letting a cell occupy no more width than its content requires, so neighboring cells sit against it and two right-aligned cells at the end of a row read as one. The research covers:

1. The installed `@earendil-works/pi-tui` layout primitives (`HStack`, `VStack`, their child sizing options, allocation, intrinsic sizing, and render-width behavior).
2. Current documented models in CSS flexbox/grid, Starship, Powerlevel10k, tmux, lualine, Waybar, i3bar, Neovim's built-in statusline, and Figma Auto Layout.
3. Documented truncation and clipping behavior when content exceeds available width.
4. Terminology those systems use for content sizing, remaining-space sizing, and adjacent grouping.

This report does not inspect pi-jefferson source outside the change directory, does not recommend a design, and does not write proposal, specification, design, or task artifacts.

## Findings

### 1. Installed pi-tui layout primitives

The installed package is `@earendil-works/pi-tui` version `1.5.0` (`package.json:1-4`). The local package README and declarations are the authoritative API references; the installed `dist/*.js` files establish allocator behavior that the README and declarations do not fully specify.

#### 1.1 API surface

`HStack` and `VStack` both extend `Stack`; each accepts `StackChild[]` and `StackOptions`, and each implements `render(width: number): string[]`:

- `StackEntryOptions` are `basis?: number | "auto"`, `grow?: number`, `shrink?: number`, `minSize?: number`, `maxSize?: number`, and `visible?: (viewport) => boolean` (`dist/components/stack.d.ts:3-10`; mirrored in `dist/layout-node.d.ts:7-15`).
- `StackOptions` are `gap?: number` and `align?: "stretch" | "start" | "center" | "end"` (`dist/components/stack.d.ts:15-18`). There are no child options named `width`, `min`, or `max`; the declared names are `basis`, `minSize`, and `maxSize`.
- `HStack` lays children out horizontally (`dist/components/h-stack.d.ts:1-6`); `VStack` lays children out vertically (`dist/components/v-stack.d.ts:1-7`).
- The README says explicit `VStack`/`HStack` constrained-region layouts are alternate-screen viewport semantics and are intentionally unavailable on `TuiMainScreen` (`README.md:119-122`). It also says direct `render(width)` on a layout component produces an unbounded document (`README.md:162-164`).

Implementation defaults are `gap = 0`, `align = "stretch"`, `grow = 0`, `shrink = 1`, `minSize = 0`, and effectively unbounded `maxSize` unless options are provided (`dist/components/stack.js:13-32`, `58-72`). A missing `basis` behaves the same as `basis: "auto"` for allocation (`dist/components/stack.js:99-100`).

#### 1.2 Auto/content basis and intrinsic measurement

There is an auto/content basis, but there is no separate intrinsic-width callback or property in the public component interface.

For `HStack` direct rendering, every child is first rendered at the full stack width; the child's intrinsic width is the maximum `visibleWidth()` across the lines returned by that render. The allocator then assigns widths and each nonzero-width child is rendered a second time at its allocated width (`dist/components/h-stack.js:15-21`).

In the alternate-screen layout path, `measureWidth()` has the same definition—maximum visible width of lines returned by `render(width)`—but numeric bases skip that width measurement (`dist/layout.js:31-32`, `118-119`). A plain component is then rendered at the allocated safe width and its allocated rectangle is recorded (`dist/layout.js:48-68`, `141-155`).

For `VStack`, auto measurement is intrinsic **height**, not width: the child is rendered at the stack width and its line count is the intrinsic size (`dist/layout.js:28-29`, `98-115`). Direct `VStack.render(width)` uses each child's rendered line count and has no available-height argument to shrink into (`dist/components/v-stack.js:7-23`).

#### 1.3 Width allocation

The installed allocator works as follows (`dist/components/stack.js:99-109`):

1. Start each child at its numeric `basis`, or at the measured intrinsic size when `basis` is missing or `"auto"`.
2. Clamp each starting size to `minSize` and `maxSize` (`dist/components/stack.js:58-62`).
3. Subtract total inter-child gaps from the available size: `contentSize = availableSize - (entryCount - 1) * gap` (`dist/components/stack.js:103`).
4. If total bases are smaller than `contentSize`, distribute the surplus only among entries with `grow > 0` and remaining `maxSize` capacity (`dist/components/stack.js:69-71`, `105-106`). Without a positive-grow child, surplus remains unused; with default `gap = 0`, auto-sized children therefore remain adjacent at the start of an `HStack`.
5. If total bases exceed `contentSize`, remove the deficit only among entries with `shrink > 0` and size above `minSize` (`dist/components/stack.js:72`, `107-108`). If candidates exhaust their shrink capacity, the allocator returns an over-wide total rather than forcing `shrink: 0` children or `minSize` floors smaller.
6. Growth weights are the `grow` values. Shrink weights are `shrink * max(1, currentSize)` (`dist/components/stack.js:76-88`). The distribution loop floors each proposal, gives at least one column to a candidate, respects capacity, subtracts as it iterates in entry order, and repeats until no deficit/surplus or no candidates remain (`dist/components/stack.js:63-98`).

The order-dependent rounding matters. A local invocation of the installed allocator confirmed that two `basis: 0, grow: 1` children in width 30 receive `[20, 10]`, not `[15, 15]`; two `basis: 10, shrink: 1` children in width 15 receive `[7, 8]`; and two `basis: 20, shrink: 0` children in width 10 remain `[20, 20]`. Those outcomes follow directly from the loop at `dist/components/stack.js:63-98`, but the README does not document a proportional-rounding rule.

#### 1.4 Allocated width and render dependence

A child does receive its allocated width. The `Component` contract is `render(width: number): string[]`, where `width` is documented as the current viewport width (`dist/tui.d.ts:68-75`; `README.md:245-261`). The README requires every returned line to fit that width and says the TUI errors if a line exceeds it (`README.md:259-261`). Therefore a child component's render can depend on the allocated width; that is the intended render input.

Direct `HStack.render(width)` renders auto-measured children at full width first and again at allocated width (`dist/components/h-stack.js:15-21`). The alternate-screen layout caches rendered lines by component and width (`dist/layout.js:15-27`). Zero-width `HStack` children are represented by an empty layout box and are not recursively rendered in the alternate-screen path (`dist/layout.js:141-153`).

### 2. Prior art: content width, right-edge grouping, and remaining space

| System | User model and names | “Only as wide as content” | “Adjacent group at the right edge” | “Take remaining space” | Documented limits/costs |
|---|---|---|---|---|---|
| CSS flexbox | `flex-basis`, `flex-grow`, `flex-shrink`, `justify-content`, auto margins | Initial `flex-basis: auto` uses an explicit main size if present, otherwise content size; `flex: none` is `0 0 auto` and cannot grow or shrink. | `justify-content: flex-end` aligns the whole item set; an auto margin can separate one item or group from others. | Positive `flex-grow` distributes positive free space by grow factor. | Default `flex-shrink: 1` lets content-sized items shrink; shrinking is subject to `min-content` / automatic-minimum-size behavior. |
| CSS grid | Track sizes `auto`, `min-content`, `max-content`, `fit-content()`, `<flex>`/`fr` | `auto` generally behaves like `minmax(min-content, max-content)`; `max-content`, `min-content`, and `fit-content(limit)` are explicit track keywords. | Explicit tracks can place a content-sized group at an edge; `justify-content` can position the grid. | Each `fr` track takes a proportional share of remaining space. | Auto tracks can be stretched by `align-content`/`justify-content`; `fr` outside `minmax()` implies an automatic minimum. |
| Starship | Prompt-wide `format` and `right_format`; `fill` module | Modules in a format string render adjacently unless separators or filler are configured. | `right_format` targets shells with a native right prompt; `$fill` before a group right-aligns following modules on the same format line. | `fill` consumes extra space; multiple `fill` modules split it evenly. | Native right prompt is shell-dependent and single-line at the input location. There is no documented row-wide truncation priority. |
| Powerlevel10k | `POWERLEVEL9K_LEFT_PROMPT_ELEMENTS`, `POWERLEVEL9K_RIGHT_PROMPT_ELEMENTS`, segment/subsegment separators, first-line gap filler | Segments render from their configured content, with whitespace and separators separately configurable. | Right prompt elements are an ordered right-side segment list; separators can be empty. | `POWERLEVEL9K_MULTILINE_FIRST_PROMPT_GAP_CHAR` fills the first-line gap between left and right prompts. | The right prompt on the command line hides when input reaches it; a right prompt above the command line hides if it would overlap the left prompt. |
| tmux | `status-left`, central window list, `status-right`, `status-format`, `status-justify`, `status-*-length`, style `align`/`width` | A left or right format string's expanded content is one adjacent string; `#[width=N]` can force a styled area width. | `status-right` is the right section; `status-format` supports `#[nolist align=right]`. | Alignment styles can consume available space; the window list sits between left and right sections. | `status-justify` positions only the window list. Left and right sections have separate maximum lengths, defaulting to 10 and 40. |
| lualine | Left sections `a`, `b`, `c`; right sections `x`, `y`, `z`; components; section/component separators | Components are placed inside sections; component `padding` can be zero. | Right sections `x/y/z` form the right-side group; empty separators make section/component boundaries visually contiguous. | `always_divide_middle` controls whether left sections may take the whole line when right sections are absent. | Width/truncation controls are component-specific (`max_length`, `shorting_target`) or user code (`cond`, `fmt`); the README/help do not document one global shrink-priority algorithm. |
| Waybar | `modules-left`, `modules-center`, `modules-right`; module `min-length`/`max-length`; `expand-*` | Modules are arrays in named side/center groups; each module's `min-length` and `max-length` bounds its displayed character length. | `modules-right` is the right group; `spacing` controls gaps between modules. | `expand-center` is documented as consuming leftover space; `expand-left` and `expand-right` exist, but the retrieved man text has an apparent target-description typo for both. | `fixed-center` can still be pushed when side blocks need more space. Length options are module options, not a documented global priority across modules. |
| i3bar | JSON stream of status lines containing ordered blocks; `full_text`, `short_text`, `min_width`, `align`, `separator`, `separator_block_width` | A block's `full_text` determines its content; `min_width` only pads below a minimum. | Blocks are adjacent protocol entries; `separator: false` removes the separator line, and `separator_block_width: 0` removes the reserved gap. | No named grow/fill block was found in the cited protocol. | When the line needs shortening, i3bar uses `short_text` where provided. A nonzero minimum width prevents layout shifting but reserves space. |
| Neovim statusline | `%` items, `minwid`, `maxwid`, item groups `%(...)`, alignment separator `%=`, truncation marker `%<` | An item takes its content width unless a `minwid` pads it; empty groups can disappear. | One `%=` right-aligns what follows; two `%=` create a centered middle section. Adjacent items/groups remain adjacent unless separators/padding are inserted. | `%=` distributes separation between alignment sections. | `maxwid` truncates text items from the left; `%<` selects the truncation point and the first competing marker wins. |
| Figma Auto Layout | `Hug contents`, `Fill container`, `Fixed width/height`, min/max dimensions | `Hug contents` keeps the smallest frame dimensions around child objects while respecting spacing. | Auto-layout children stay in one frame and spacing can be fixed or automatic. | `Fill container` stretches a child to occupy all available parent space. | If any child uses `Fill container`, the parent no longer hugs contents on that axis and becomes fixed. |

#### CSS flexbox and grid

MDN's flexbox guide states the initial values as `flex-grow: 0`, `flex-shrink: 1`, and `flex-basis: auto`; with no explicit main size, `flex-basis: auto` uses the content size, so flex items line up using only the space needed for their contents. `flex: none` is exactly `flex: 0 0 auto`, making the item inflexible [S10][S11].

MDN defines positive free space as space left after natural item sizes, and negative free space as the amount by which natural sizes exceed the container. Positive free space is distributed by `flex-grow`; negative free space is removed by `flex-shrink`, with the shrink factor multiplied by the flex base size. Small items do not shrink below `min-content` in the documented algorithm [S12]. The `min-width: auto` value for flex/grid items can likewise resolve to `min-content`, unless an exception such as a scroll container applies [S13].

For grouping, `justify-content` treats flex items as a group on the main axis. MDN specifically presents `space-between` as putting available space between items with the outer items flush to the edges, and presents auto margins as the mechanism to separate an item or group when individual main-axis alignment is needed [S14].

CSS grid exposes more explicit track names: `auto`, `min-content`, `max-content`, `fit-content(limit)`, `minmax()`, and `<flex>` (`fr`). MDN says `fr` tracks share remaining space in proportion to their flex factors, and that `auto` generally corresponds to `minmax(min-content, max-content)` [S15]. `fit-content` is defined as `min(max-content, max(min-content, stretch))` when used in sizing properties [S16].

#### Starship

Starship's prompt-wide configuration has `format` and `right_format`. The `fill` module fills extra space on a line with a configurable symbol; multiple fills split the extra space evenly. This lets a format such as left modules, `$fill`, then right modules put the right modules together at the right edge [S17].

Native `right_format` is separate: Starship documents it as a single-line right prompt after the input location, available only for named supported shells. It directs users to `$fill` for right alignment above the input line in a multi-line prompt [S18].

Starship documents truncation per module rather than as a line-wide priority. For example, `directory.truncation_length`, `directory.truncate_to_repo`, and `truncation_symbol` control directory shortening; `git_branch.truncation_length` and `truncation_symbol` control branch shortening [S17].

#### Powerlevel10k

Powerlevel10k's generated lean configuration uses ordered `POWERLEVEL9K_LEFT_PROMPT_ELEMENTS` and `POWERLEVEL9K_RIGHT_PROMPT_ELEMENTS` arrays. Its comments say to put the most important segments on the left and less important segments on the right. The same comments state that the right prompt on the command line is automatically hidden when input reaches it, and a right prompt above the command line is hidden if it would overlap the left prompt [S19].

The generated configuration exposes left/right segment separators, subsegment separators, and whitespace settings. It also exposes `POWERLEVEL9K_MULTILINE_FIRST_PROMPT_GAP_CHAR`, described as filler between the left and right prompt on the first prompt line [S19].

Powerlevel10k's documented narrow-width behavior is mostly segment-specific. The directory segment has `POWERLEVEL9K_SHORTEN_STRATEGY`, `POWERLEVEL9K_SHORTEN_DIR_LENGTH`, `POWERLEVEL9K_DIR_MAX_LENGTH`, `POWERLEVEL9K_DIR_MIN_COMMAND_COLUMNS`, and `POWERLEVEL9K_DIR_MIN_COMMAND_COLUMNS_PCT`; the default lean comments say an overlong directory is shortened, and on the last prompt line it is shortened enough to leave command columns [S19].

#### tmux

The tmux manual describes the default status line as configurable left and right sections plus a central window list. `status-left` and `status-right` are format strings, while `status-left-length` and `status-right-length` set maximum lengths (defaults 10 and 40). `status-justify` positions the window list as left, centre, right, or absolute-centre; it is not a general setting for the left/right components [S20].

`status-format[]` can replace the default line. The manual's example appends `#[nolist align=right]#{pane_current_path}` to put an extra value at the right. Style syntax also provides `align=left|centre|right`, `fill=colour`, and `width=N`, where width can be a column count or percentage [S20].

For truncation, tmux documents both the side-length maxima and format modifiers. For example, `#{T;=10:status-left}` limits the expanded string to at most 10 characters. For the window list, `list=focus` identifies the row to keep visible and `list=left-marker` / `list=right-marker` identify text used when list content is trimmed [S20].

#### lualine

lualine's documented layout diagram is left sections `A`, `B`, `C`, a large middle gap, and right sections `X`, `Y`, `Z`. Each section holds components. It distinguishes `section_separators` between sections from `component_separators` between components, and both can be set to empty strings [S21].

Component-level `padding` defaults to 1 and can be configured independently on left and right. `cond` is a user-supplied function that controls whether the component is loaded, and `fmt` is a user-supplied formatter for the component output [S21].

The documented sizing/truncation knobs are not a universal allocator. `buffers.max_length`, `windows.max_length`, `tabs.tab_max_length`, and `tabs.max_length` bound those components; `filename.shorting_target` shortens a path to leave a configurable number of columns for other components. Global `always_divide_middle = true` prevents left sections from taking over the whole statusline even when no right sections are present [S21].

#### Waybar

Waybar configuration places module names in `modules-left`, `modules-center`, and `modules-right`, with `spacing` for gaps. `fixed-center = true` prefers a fixed center position, but the center block can still be pushed when side blocks need more space [S22].

The current man page adds `expand-left`, `expand-center`, and `expand-right`; `expand-center` is documented as consuming leftover space dynamically. The man text retrieved for `expand-left` and `expand-right` both says they enable `modules-left`, an apparent documentation inconsistency that leaves the exact target of `expand-right` ambiguous. `no-center` can disable the center group for use with `expand-*` [S23].

Waybar's custom-module options document `max-length` as the maximum character length a module should display, `min-length` as the minimum character length it should accept, `align` as label alignment within the module, and `justify` as text alignment within the label [S24].

#### i3bar protocol

The i3bar protocol represents each status line as an array of ordered block objects. `full_text` is required and is displayed; an empty `full_text` skips the block. `short_text` is explicitly the fallback used when the status line needs to be shortened because it exceeds screen space [S25].

A block can set `min_width`, in pixels or as a string whose measured width becomes the minimum. If content is narrower, i3bar pads according to `align` (`left`, `center`, or `right`). The documentation says this is useful to prevent the status line shifting as values change [S25].

Blocks can disable the separator line with `separator: false`, but the documented gap remains unless `separator_block_width` is also reduced; the default gap is 9 pixels [S25].

#### Neovim built-in statusline

Neovim's built-in `'statusline'` format gives every item optional minimum and maximum width fields in the form `%-0{minwid}.{maxwid}{item}`. A `minwid` pads; a `maxwid` truncates text items from the left [S26].

`%=` is the alignment-section separator. One `%=` right-aligns what follows; two `%=` markers create a middle part with whitespace on both sides. `%<` marks where to truncate if the line is too long; the default is the first item, and the first competing marker wins [S26].

Item groups `%(...%)` provide explicit grouping. If every item in a group becomes empty and no `minwid` is set, the whole group disappears [S26].

#### Figma Auto Layout terminology

Figma's Auto Layout uses **Hug contents** for the smallest parent dimensions around child objects, **Fill container** for a child occupying all available parent space, and **Fixed width/height** for unchanged explicit dimensions. Minimum and maximum dimensions can be combined with those resizing settings. Figma also documents the limit that a parent cannot hug contents on an axis when a child fills the container on that axis [S27].

### 3. Documented truncation and clipping priority

| System | Documented rule |
|---|---|
| pi-tui `HStack`/`VStack` | The stack allocator shrinks only entries with positive `shrink` and room above `minSize`; if candidates are exhausted, returned child sizes can still exceed the container. A component is responsible for returning lines no wider than its render width; the documented TUI behavior is an error if it does not. [S1][S3][S5][S7] |
| CSS flexbox | Positive `flex-shrink` distributes negative free space; the shrink factor is multiplied by flex base size, and items do not shrink below `min-content` under the documented algorithm. `min-width: auto` can impose the same floor unless an exception applies. [S12][S13] |
| Starship | Truncation is configured per module (`directory.truncation_length`, `git_branch.truncation_length`, etc.); no prompt-wide priority among modules was found in the current configuration documentation. [S17] |
| Powerlevel10k | Directory shortening has explicit strategy, length, anchor, and command-column settings. Independently, the right prompt hides when command input reaches it or would overlap the left prompt above the command line. [S19] |
| tmux | `status-left-length` and `status-right-length` cap the two side sections. Format modifiers such as `#{T;=10:...}` impose character limits. The window list uses `list=focus`, `list=left-marker`, and `list=right-marker` when the whole list does not fit. [S20] |
| lualine | Width limits are component-specific (`buffers.max_length`, `windows.max_length`, `tabs.max_length`, `tabs.tab_max_length`, `filename.shorting_target`). `cond` can suppress a component and `fmt` can rewrite it, including based on user-computed context; the documentation does not name a global priority rule. [S21] |
| Waybar | `max-length` and `min-length` are per-module character bounds. `fixed-center` yields to side blocks when they need more space. No general documented priority deciding which arbitrary module clips first was found. [S22][S23][S24] |
| i3bar | i3bar uses a block's `short_text` when the status line needs shortening; otherwise `full_text` is displayed. This is a block-supplied fallback rather than a global shrink factor. [S25] |
| Neovim statusline | `maxwid` truncates a text item from the left. `%<` marks the line truncation point; default is the first item and the first competing marker wins. [S26] |

### 4. Terminology inventory

These are other systems' names; the project vocabulary remains rows, cells, and instruments, and `module` / `widget` remain rejected project words.

| Term | Systems using it | Meaning there |
|---|---|---|
| `auto` | CSS flex/grid, pi-tui | CSS: derive basis from explicit size or content; grid auto tracks range from minimum to maximum. pi-tui: derive basis from rendered content size. |
| `content` | CSS `flex-basis` | Automatically size from the flex item's content. |
| `fit-content` | CSS width/track sizing | Fit content but stop at the available or specified limit; formula `min(max-content, max(min-content, stretch/limit))`. |
| `min-content` / `max-content` | CSS | Intrinsic minimum and intrinsic preferred content sizes. |
| intrinsic / natural size | CSS documentation; pi-tui implementation naming | The measured content contribution before free-space distribution. pi-tui's implementation calls its measured values `intrinsicWidths`/`intrinsicHeights`, but the public option is `basis: "auto"`. |
| `fill` | Starship, Powerlevel10k (“filler”), Figma `Fill container`, tmux `fill=colour` | Consume or visually fill available space. Meanings differ: Starship inserts a filler module; Figma grows a child; tmux fills background color. |
| `grow` / `flex-grow` | pi-tui, CSS | Positive free-space share. |
| `shrink` / `flex-shrink` | pi-tui, CSS | Negative free-space removal factor. |
| `Hug contents` | Figma | Parent shrinks to the smallest dimensions around children, respecting spacing. |
| `min_width` / `minwid`; `max_length` / `maxwid` | i3bar, Neovim, lualine, Waybar | Minimum or maximum space assigned to an item/component. Names are system-specific. |
| `short_text` / `shorting_target` | i3bar, lualine | Alternate shorter content or a target for shortening. |
| `section` / `segment` / `component` / `block` / `item` / `track` | lualine, Powerlevel10k, CSS/i3bar/Neovim | Their grouping units. These are reported as the other systems' vocabulary, not proposed project vocabulary. |
| `separator` | Starship formatting, Powerlevel10k, tmux window list, lualine, i3bar | Explicit visual boundary or gap between adjacent units. |
| shrink-wrap | None of the cited systems surveyed here | Not a documented term in the cited docs; the nearest documented terms are CSS `fit-content` and Figma `Hug contents`. |

### 5. Differences from the supplied assumptions

- The brief says pi-jefferson currently gives every cell in a row an equal share and spreads the remainder one column at a time to earliest cells. That repository behavior was not inspected because it is Eleanor's lane. The installed pi-tui stack primitive does **not** default to equal shares: missing or `auto` basis starts from measured content size, default `grow` is 0, and only positive-grow entries receive surplus. [S1][S2][S3]
- pi-tui's distribution rounding is not the documented “remainder one column at a time to earliest cells” rule. Its implementation repeatedly proposes floored weighted shares while mutating the remaining amount and gives at least one column per pass; this can produce substantially unequal sizes for equal grow weights. [S3]
- pi-tui's `align` on `Stack` is cross-axis alignment (`stretch`, `start`, `center`, `end`), not main-axis justification such as CSS `justify-content`. [S2][S4][S5]
- pi-tui has an auto/content basis, but no declared `width` option and no intrinsic-measure callback. It measures by rendering the component. [S2][S4][S5][S8]

### 6. Gaps and failed verification attempts

- pi-jefferson source outside `openspec/changes/cell-widths` was intentionally not read, per the brief. This report therefore cannot state how the current project maps cells to pi-tui components or whether a spacer component already exists.
- Context7 resolved the request to `/earendil-works/pi`, not a separate `@earendil-works/pi-tui` ID. Its returned pi-tui material matched the installed README, but exact allocator rounding was not documented there; the installed declarations and implementation were used for those facts.
- lualine's README and help document section/component options and component-specific width limits, but not a global allocator or priority rule for arbitrary sections under pressure.
- Waybar documents per-module `min-length`/`max-length` and group expansion, but not a universal cross-module truncation priority.
- Starship documents several per-module truncation options, but no prompt-wide truncation priority.
- Polybar's previous Read the Docs URLs returned HTTP 404, and Apple's JavaScript-rendered documentation pages could not be extracted with the available fetch configuration. Neither was used as evidence.
- Web search hit an Exa rate limit for some queries. Direct official documentation fetches succeeded for every cited external source above.

## Sources

### Change-directory and local installed pi-tui sources

- [S0] `/Users/joelleibow/Projects/pi-jefferson/openspec/changes/cell-widths/owner-rulings.md` — binding objective, vocabulary, and scope rulings.

The local prefix below is `/Users/joelleibow/.local/share/fnm/node-versions/v26.8.1/installation/lib/node_modules/@earendil-works/pi-coding-agent/node_modules/@earendil-works/pi-tui`.

- [S1] `README.md:119-164`, `245-261`, `405-414` — alternate-screen layout semantics, stack options example, component render contract, and `TruncatedText`.
- [S2] `dist/components/stack.d.ts:1-31` and `dist/layout-node.d.ts:1-39` — declared stack entry, gap, alignment, and layout-node API.
- [S3] `dist/components/stack.js:13-32`, `55-109` — installed defaults and exact allocation loop.
- [S4] `dist/components/h-stack.js:9-41` — direct horizontal render, intrinsic width measurement, allocation, and second render at allocated width.
- [S5] `dist/layout.js:15-32`, `48-68`, `96-155` — alternate-screen render cache, intrinsic measurement, plain-component allocation, stack layout, zero-width child handling.
- [S6] `dist/components/v-stack.js:7-23` — direct vertical render and intrinsic-height behavior.
- [S7] `dist/tui.d.ts:68-75` — `Component.render(width)` contract.
- [S8] `package.json:1-4` — installed package name and version.

### External documentation

- [S10] MDN, “Basic concepts of flexbox” and “flex-basis” — https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_flexible_box_layout/Basic_concepts_of_flexbox ; https://developer.mozilla.org/en-US/docs/Web/CSS/flex-basis
- [S11] MDN, “flex-basis” — https://developer.mozilla.org/en-US/docs/Web/CSS/flex-basis
- [S12] MDN, “Controlling ratios of flex items along the main axis” and “flex-shrink” — https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_flexible_box_layout/Controlling_ratios_of_flex_items_along_the_main_axis ; https://developer.mozilla.org/en-US/docs/Web/CSS/flex-shrink
- [S13] MDN, “min-width” — https://developer.mozilla.org/en-US/docs/Web/CSS/min-width
- [S14] MDN, “Aligning items in a flex container” — https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_flexible_box_layout/Aligning_items_in_a_flex_container
- [S15] MDN, “grid-template-columns” — https://developer.mozilla.org/en-US/docs/Web/CSS/grid-template-columns
- [S16] MDN, “fit-content” — https://developer.mozilla.org/en-US/docs/Web/CSS/fit-content
- [S17] Starship, “Configuration” — https://starship.rs/config/
- [S18] Starship, “Advanced Configuration — Enable Right Prompt” — https://starship.rs/advanced-config/
- [S19] Powerlevel10k, generated lean configuration — https://raw.githubusercontent.com/romkatv/powerlevel10k/master/config/p10k-lean.zsh
- [S20] tmux manual — https://man.openbsd.org/tmux
- [S21] lualine README and help — https://raw.githubusercontent.com/nvim-lualine/lualine.nvim/master/README.md ; https://raw.githubusercontent.com/nvim-lualine/lualine.nvim/master/doc/lualine.txt
- [S22] Waybar Configuration wiki — https://github.com/Alexays/Waybar/wiki/Configuration
- [S23] Waybar man page — https://man.archlinux.org/man/waybar.5.en
- [S24] Waybar custom-module man source — https://raw.githubusercontent.com/Alexays/Waybar/master/man/waybar-custom.5.scd
- [S25] i3bar input protocol — https://i3wm.org/docs/i3bar-protocol.html
- [S26] Neovim `options.txt`, `'statusline'` — https://raw.githubusercontent.com/neovim/neovim/master/runtime/doc/options.txt
- [S27] Figma, “Guide to auto layout” — https://help.figma.com/hc/en-us/articles/360040451373-Explore-auto-layout-properties
