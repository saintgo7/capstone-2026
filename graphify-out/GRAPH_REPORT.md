# Graph Report - .  (2026-06-15)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 109 nodes · 177 edges · 14 communities (13 shown, 1 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9ae3222f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Data Storage Operations|Data Storage Operations]]
- [[_COMMUNITY_Admin Panel Features|Admin Panel Features]]
- [[_COMMUNITY_UI Rendering Utilities|UI Rendering Utilities]]
- [[_COMMUNITY_Curriculum Admin Interface|Curriculum Admin Interface]]
- [[_COMMUNITY_Gallery Admin Interface|Gallery Admin Interface]]
- [[_COMMUNITY_Notices Admin Interface|Notices Admin Interface]]
- [[_COMMUNITY_Professors Admin Interface|Professors Admin Interface]]
- [[_COMMUNITY_Project Documentation|Project Documentation]]
- [[_COMMUNITY_Gallery Page Logic|Gallery Page Logic]]
- [[_COMMUNITY_Notices Page Logic|Notices Page Logic]]
- [[_COMMUNITY_Contact Page Functionality|Contact Page Functionality]]

## God Nodes (most connected - your core abstractions)
1. `_write()` - 9 edges
2. `getAll()` - 7 edges
3. `Purpose` - 7 edges
4. `_getKey()` - 6 edges
5. `_read()` - 6 edges
6. `renderCurriculum()` - 4 edges
7. `saveCourse()` - 4 edges
8. `renderGallery()` - 4 edges
9. `renderNotices()` - 4 edges
10. `renderProfessors()` - 4 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Import Cycles
- None detected.

## Communities (14 total, 1 thin omitted)

### Community 0 - "Data Storage Operations"
Cohesion: 0.15
Nodes (18): clearAll(), count(), create(), exportAll(), _generateId(), getAll(), getById(), _getKey() (+10 more)

### Community 1 - "Admin Panel Features"
Cohesion: 0.27
Nodes (11): Curriculum Management, Gallery Management, Admin Dashboard, Admin Login, Notices Management, Professors Management, Gallery Page, Home Page (+3 more)

### Community 2 - "UI Rendering Utilities"
Cohesion: 0.21
Nodes (6): createElement(), escapeHtml(), nl2br(), showToast(), Notices Page, Program Page

### Community 3 - "Curriculum Admin Interface"
Cohesion: 0.42
Nodes (8): clearForm(), closeModal(), deleteCourse(), openEdit(), openModal(), renderCurriculum(), saveCourse(), updateTabActive()

### Community 4 - "Gallery Admin Interface"
Cohesion: 0.46
Nodes (7): clearForm(), closeModal(), deleteItem(), openEdit(), openModal(), renderGallery(), saveItem()

### Community 5 - "Notices Admin Interface"
Cohesion: 0.46
Nodes (7): clearForm(), closeModal(), deleteNotice(), openEdit(), openModal(), renderNotices(), saveNotice()

### Community 6 - "Professors Admin Interface"
Cohesion: 0.46
Nodes (7): clearForm(), closeModal(), deleteProf(), openEdit(), openModal(), renderProfessors(), saveProf()

### Community 7 - "Project Documentation"
Cohesion: 0.25
Nodes (8): Documentation Outline, Known Limitations, Project Type, Purpose, Remaining Steps, Structure, Unverified, Verified Facts

### Community 8 - "Gallery Page Logic"
Cohesion: 0.47
Nodes (3): getFilteredGallery(), openLightbox(), renderGallery()

### Community 9 - "Notices Page Logic"
Cohesion: 0.53
Nodes (4): getFilteredNotices(), openModal(), renderNotices(), renderPagination()

## Knowledge Gaps
- **7 isolated node(s):** `Project Type`, `Structure`, `Verified Facts`, `Unverified`, `Known Limitations` (+2 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Gallery Page` connect `Admin Panel Features` to `Gallery Page Logic`, `UI Rendering Utilities`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Why does `Notices Page` connect `UI Rendering Utilities` to `Admin Panel Features`, `Notices Page Logic`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Why does `Contact Page` connect `Contact Page Functionality` to `Admin Panel Features`, `UI Rendering Utilities`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **What connects `Project Type`, `Structure`, `Verified Facts` to the rest of the system?**
  _7 weakly-connected nodes found - possible documentation gaps or missing edges._