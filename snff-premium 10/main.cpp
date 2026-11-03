// Social Network Friend Finder - DSA core in C++17 (undirected graph, adjacency list)
// Compile: g++ -std=c++17 -o friendfinder main.cpp    Run: ./friendfinder
#include <iostream>
#include <map>
#include <set>
#include <vector>
#include <queue>
#include <stack>
#include <algorithm>
using namespace std;

class SocialGraph {
    map<int, set<int>> adj;          // user id -> set of friend ids (sorted, no duplicates)
    map<int, string> names;          // user id -> name
public:
    // 1. Add a user (a new vertex)
    void addUser(int id, const string& name) { names[id] = name; adj[id]; }

    // 2. Add friendship (edge both ways because friendship is mutual)
    bool addFriendship(int a, int b) {
        if (!adj.count(a) || !adj.count(b) || a == b) return false;
        adj[a].insert(b); adj[b].insert(a); return true;
    }
    // 3. Remove friendship
    bool removeFriendship(int a, int b) {
        if (!adj.count(a) || !adj.count(b)) return false;
        return adj[a].erase(b) && adj[b].erase(a);
    }
    // 4. Display network
    void display() const {
        for (auto& [id, fr] : adj) {
            cout << names.at(id) << " (" << id << ") -> ";
            for (int f : fr) cout << names.at(f) << " ";
            cout << "\n";
        }
    }
    // 5. Mutual friends = intersection of two adjacency sets, O(d1 + d2)
    vector<int> mutualFriends(int a, int b) const {
        vector<int> res;
        set_intersection(adj.at(a).begin(), adj.at(a).end(), adj.at(b).begin(), adj.at(b).end(), back_inserter(res));
        return res;
    }
    // 6. BFS using a queue, O(V + E)
    vector<int> bfs(int start) const {
        vector<int> order; set<int> seen{start}; queue<int> q; q.push(start);
        while (!q.empty()) {
            int u = q.front(); q.pop(); order.push_back(u);
            for (int v : adj.at(u)) if (seen.insert(v).second) q.push(v);
        }
        return order;
    }
    // 7. DFS using an explicit stack, O(V + E). Neighbours are pushed in reverse
    //    so the smallest id is visited first (same order as recursive DFS).
    vector<int> dfs(int start) const {
        vector<int> order; set<int> seen; stack<int> st; st.push(start);
        while (!st.empty()) {
            int u = st.top(); st.pop();
            if (!seen.insert(u).second) continue;
            order.push_back(u);
            for (auto it = adj.at(u).rbegin(); it != adj.at(u).rend(); ++it)
                if (!seen.count(*it)) st.push(*it);
        }
        return order;
    }
    // 8. Shortest path (fewest friendships) using BFS with parent links. Empty = no path.
    vector<int> shortestPath(int s, int t) const {
        map<int, int> parent{{s, -1}}; queue<int> q; q.push(s);
        while (!q.empty() && !parent.count(t)) {
            int u = q.front(); q.pop();
            for (int v : adj.at(u)) if (!parent.count(v)) { parent[v] = u; q.push(v); }
        }
        vector<int> path;
        if (!parent.count(t)) return path;
        for (int x = t; x != -1; x = parent[x]) path.push_back(x);
        reverse(path.begin(), path.end());
        return path;
    }
    // 9. Recommendations: non-friends ranked by number of mutual friends
    vector<pair<int,int>> recommend(int u) const {
        vector<pair<int,int>> res;                       // (candidate, mutual count)
        for (auto& [c, _] : adj) {
            if (c == u || adj.at(u).count(c)) continue;
            int m = mutualFriends(u, c).size();
            if (m > 0) res.push_back({c, m});
        }
        sort(res.begin(), res.end(), [](auto& x, auto& y) { return x.second != y.second ? x.second > y.second : x.first < y.first; });
        return res;
    }
    string name(int id) const { return names.at(id); }
};

void printIds(const SocialGraph& g, const vector<int>& v) {
    for (size_t i = 0; i < v.size(); ++i) cout << (i ? " -> " : "") << g.name(v[i]);
    cout << "\n";
}

int main() {
    SocialGraph g;
    const char* n[] = {"Aarav","Priya","Rohan","Sneha","Karan","Ananya","Vikram","Meera","Arjun","Isha","Neha","Dev"};
    for (int i = 0; i < 12; ++i) g.addUser(i + 1, n[i]);           // same sample data as the website
    int e[][2] = {{1,2},{1,3},{1,4},{2,3},{2,5},{3,4},{3,6},{4,6},{5,7},{6,8},{7,8},{7,9},{8,10},{9,11},{10,11},{10,12}};
    for (auto& x : e) g.addFriendship(x[0], x[1]);

    cout << "--- Network ---\n"; g.display();
    cout << "\nMutual friends of Aarav & Priya: "; for (int m : g.mutualFriends(1, 2)) cout << g.name(m) << " "; cout << "\n";
    cout << "BFS from Aarav: "; printIds(g, g.bfs(1));
    cout << "DFS from Aarav: "; printIds(g, g.dfs(1));
    cout << "Shortest path Aarav -> Dev: "; printIds(g, g.shortestPath(1, 12));
    cout << "Recommendations for Aarav:\n";
    for (auto& [id, c] : g.recommend(1)) cout << "  " << g.name(id) << " (" << c << " mutual)\n";
    g.removeFriendship(1, 2);
    cout << "\nAfter removing Aarav-Priya, mutual friends of Aarav & Priya: " << g.mutualFriends(1, 2).size() << "\n";
    return 0;
}
