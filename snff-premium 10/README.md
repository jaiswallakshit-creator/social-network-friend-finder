# Social Network Friend Finder — Premium V4

A browser-based social network demo with a separate C++17 implementation for academic DSA submission.

## Run the website
1. Extract the ZIP.
2. Open the `snff-premium` folder in VS Code.
3. Start Live Server from `index.html` (or open the file directly in a modern browser).

The website runs its interactive demo graph algorithms in JavaScript and stores changes in browser `localStorage`. The C++ file is a standalone academic implementation; the browser does **not** execute the C++ source.

## Features
- Add users and manage friendships.
- Search the user directory and inspect detailed user profiles.
- Add or remove friendships; remove a user and all associated edges.
- Interactive SVG network graph with selected-neighbour highlighting.
- Mutual friends and friend recommendations ranked by common connections.
- BFS and DFS traversal with animated visit order.
- Shortest path between two users using BFS.
- Network insights: density, connected components, isolated users, and degree-centrality leaderboard.
- Activity and audit trail with full JSON backup export.
- JSON export of the network and local demo reset.
- Responsive dark dashboard styling.

## DSA concepts demonstrated
- Graph represented using an adjacency list.
- Breadth-First Search (BFS) using a queue.
- Depth-First Search (DFS) using recursion.
- Shortest path in an unweighted graph using BFS parent tracking.
- Mutual-friend intersection and recommendation ranking.
- Connected components and degree centrality.

## C++ build
On macOS/Linux with a C++17 compiler:

```bash
g++ -std=c++17 -Wall -Wextra -pedantic main.cpp -o friend_finder
./friend_finder
```

## Notes
- Demo data and changes are stored locally in the browser; clearing site data resets the local state.
- Use **Reset demo data** in the sidebar to restore the original sample graph.
- No backend, login service, or cloud database is included.


## V7 — Advanced Network Intelligence
- Closeness centrality estimates how efficiently each user can reach others.
- Betweenness centrality highlights users that lie on many shortest paths (Brandes algorithm).
- Tarjan's DFS low-link algorithm identifies articulation points and bridge friendships.
- A resilience summary explains whether a single user or friendship can split a component.
- All metrics are recalculated from the current in-browser graph after network changes.
