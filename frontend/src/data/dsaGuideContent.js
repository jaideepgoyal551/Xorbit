const examples = {
  'Arrays & Hashing': {
    problem: 'Two Sum',
    complexity: 'O(n) time and O(n) extra space.',
    cpp: `vector<int> twoSum(vector<int>& nums, int target) {
    unordered_map<int, int> seen;
    for (int i = 0; i < nums.size(); ++i) {
        int need = target - nums[i];
        if (seen.count(need)) return {seen[need], i};
        seen[nums[i]] = i;
    }
    return {};
}`,
    java: `int[] twoSum(int[] nums, int target) {
    Map<Integer, Integer> seen = new HashMap<>();
    for (int i = 0; i < nums.length; i++) {
        int need = target - nums[i];
        if (seen.containsKey(need)) return new int[]{seen.get(need), i};
        seen.put(nums[i], i);
    }
    return new int[0];
}`,
    python: `def two_sum(nums, target):
    seen = {}
    for i, value in enumerate(nums):
        need = target - value
        if need in seen:
            return [seen[need], i]
        seen[value] = i
    return []`
  },
  'Two Pointers': {
    problem: 'Two Sum II',
    complexity: 'O(n) time and O(1) extra space.',
    cpp: `vector<int> twoSum(vector<int>& a, int target) {
    int left = 0, right = (int)a.size() - 1;
    while (left < right) {
        int sum = a[left] + a[right];
        if (sum == target) return {left + 1, right + 1};
        if (sum < target) ++left;
        else --right;
    }
    return {};
}`,
    java: `int[] twoSum(int[] a, int target) {
    int left = 0, right = a.length - 1;
    while (left < right) {
        int sum = a[left] + a[right];
        if (sum == target) return new int[]{left + 1, right + 1};
        if (sum < target) left++;
        else right--;
    }
    return new int[0];
}`,
    python: `def two_sum(numbers, target):
    left, right = 0, len(numbers) - 1
    while left < right:
        total = numbers[left] + numbers[right]
        if total == target:
            return [left + 1, right + 1]
        if total < target:
            left += 1
        else:
            right -= 1
    return []`
  },
  Stack: {
    problem: 'Daily Temperatures',
    complexity: 'O(n) time and O(n) space. Each index enters and leaves the stack at most once.',
    cpp: `vector<int> dailyTemperatures(vector<int>& t) {
    vector<int> answer(t.size());
    stack<int> waiting;
    for (int i = 0; i < t.size(); ++i) {
        while (!waiting.empty() && t[i] > t[waiting.top()]) {
            int day = waiting.top(); waiting.pop();
            answer[day] = i - day;
        }
        waiting.push(i);
    }
    return answer;
}`,
    java: `int[] dailyTemperatures(int[] t) {
    int[] answer = new int[t.length];
    Deque<Integer> waiting = new ArrayDeque<>();
    for (int i = 0; i < t.length; i++) {
        while (!waiting.isEmpty() && t[i] > t[waiting.peek()]) {
            int day = waiting.pop();
            answer[day] = i - day;
        }
        waiting.push(i);
    }
    return answer;
}`,
    python: `def daily_temperatures(temperatures):
    answer = [0] * len(temperatures)
    waiting = []
    for i, temperature in enumerate(temperatures):
        while waiting and temperature > temperatures[waiting[-1]]:
            day = waiting.pop()
            answer[day] = i - day
        waiting.append(i)
    return answer`
  },
  'Binary Search': {
    problem: 'Binary Search',
    complexity: 'O(log n) time and O(1) extra space.',
    cpp: `int search(vector<int>& nums, int target) {
    int left = 0, right = (int)nums.size() - 1;
    while (left <= right) {
        int mid = left + (right - left) / 2;
        if (nums[mid] == target) return mid;
        if (nums[mid] < target) left = mid + 1;
        else right = mid - 1;
    }
    return -1;
}`,
    java: `int search(int[] nums, int target) {
    int left = 0, right = nums.length - 1;
    while (left <= right) {
        int mid = left + (right - left) / 2;
        if (nums[mid] == target) return mid;
        if (nums[mid] < target) left = mid + 1;
        else right = mid - 1;
    }
    return -1;
}`,
    python: `def search(nums, target):
    left, right = 0, len(nums) - 1
    while left <= right:
        mid = left + (right - left) // 2
        if nums[mid] == target:
            return mid
        if nums[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1`
  },
  'Sliding Window': {
    problem: 'Longest Substring Without Repeating Characters',
    complexity: 'O(n) time and O(k) space, where k is the character set size.',
    cpp: `int lengthOfLongestSubstring(string s) {
    unordered_map<char, int> last;
    int left = 0, best = 0;
    for (int right = 0; right < s.size(); ++right) {
        if (last.count(s[right])) left = max(left, last[s[right]] + 1);
        last[s[right]] = right;
        best = max(best, right - left + 1);
    }
    return best;
}`,
    java: `int lengthOfLongestSubstring(String s) {
    Map<Character, Integer> last = new HashMap<>();
    int left = 0, best = 0;
    for (int right = 0; right < s.length(); right++) {
        char c = s.charAt(right);
        if (last.containsKey(c)) left = Math.max(left, last.get(c) + 1);
        last.put(c, right);
        best = Math.max(best, right - left + 1);
    }
    return best;
}`,
    python: `def length_of_longest_substring(s):
    last = {}
    left = best = 0
    for right, char in enumerate(s):
        if char in last:
            left = max(left, last[char] + 1)
        last[char] = right
        best = max(best, right - left + 1)
    return best`
  },
  'Linked List': {
    problem: 'Reverse Linked List',
    complexity: 'O(n) time and O(1) extra space.',
    cpp: `ListNode* reverseList(ListNode* head) {
    ListNode* previous = nullptr;
    while (head) {
        ListNode* next = head->next;
        head->next = previous;
        previous = head;
        head = next;
    }
    return previous;
}`,
    java: `ListNode reverseList(ListNode head) {
    ListNode previous = null;
    while (head != null) {
        ListNode next = head.next;
        head.next = previous;
        previous = head;
        head = next;
    }
    return previous;
}`,
    python: `def reverse_list(head):
    previous = None
    while head:
        next_node = head.next
        head.next = previous
        previous = head
        head = next_node
    return previous`
  },
  Trees: {
    problem: 'Maximum Depth of Binary Tree',
    complexity: 'O(n) time and O(h) recursion space, where h is the tree height.',
    cpp: `int maxDepth(TreeNode* root) {
    if (!root) return 0;
    return 1 + max(maxDepth(root->left), maxDepth(root->right));
}`,
    java: `int maxDepth(TreeNode root) {
    if (root == null) return 0;
    return 1 + Math.max(maxDepth(root.left), maxDepth(root.right));
}`,
    python: `def max_depth(root):
    if not root:
        return 0
    return 1 + max(max_depth(root.left), max_depth(root.right))`
  },
  'Heap / Priority Queue': {
    problem: 'Kth Largest Element in an Array',
    complexity: 'O(n log k) time and O(k) extra space using a min-heap of size k.',
    cpp: `int findKthLargest(vector<int>& nums, int k) {
    priority_queue<int, vector<int>, greater<int>> heap;
    for (int value : nums) {
        heap.push(value);
        if (heap.size() > k) heap.pop();
    }
    return heap.top();
}`,
    java: `int findKthLargest(int[] nums, int k) {
    PriorityQueue<Integer> heap = new PriorityQueue<>();
    for (int value : nums) {
        heap.offer(value);
        if (heap.size() > k) heap.poll();
    }
    return heap.peek();
}`,
    python: `import heapq

def find_kth_largest(nums, k):
    smallest = []
    for value in nums:
        heapq.heappush(smallest, value)
        if len(smallest) > k:
            heapq.heappop(smallest)
    return smallest[0]`
  },
  Backtracking: {
    problem: 'Subsets',
    complexity: 'O(n * 2^n) time to build all subsets and O(n) recursion space, excluding output.',
    cpp: `vector<vector<int>> subsets(vector<int>& nums) {
    vector<vector<int>> answer;
    vector<int> path;
    function<void(int)> dfs = [&](int i) {
        if (i == nums.size()) { answer.push_back(path); return; }
        dfs(i + 1);
        path.push_back(nums[i]);
        dfs(i + 1);
        path.pop_back();
    };
    dfs(0);
    return answer;
}`,
    java: `void build(int i, int[] nums, List<Integer> path, List<List<Integer>> out) {
    if (i == nums.length) { out.add(new ArrayList<>(path)); return; }
    build(i + 1, nums, path, out);
    path.add(nums[i]);
    build(i + 1, nums, path, out);
    path.remove(path.size() - 1);
}`,
    python: `def subsets(nums):
    answer, path = [], []
    def dfs(i):
        if i == len(nums):
            answer.append(path.copy())
            return
        dfs(i + 1)
        path.append(nums[i])
        dfs(i + 1)
        path.pop()
    dfs(0)
    return answer`
  },
  Graphs: {
    problem: 'Number of Islands',
    complexity: 'O(rows * columns) time and O(rows * columns) worst-case queue space.',
    cpp: `int numIslands(vector<vector<char>>& grid) {
    int rows = grid.size(), cols = grid[0].size(), count = 0;
    int dr[4] = {1, -1, 0, 0}, dc[4] = {0, 0, 1, -1};
    for (int r = 0; r < rows; ++r) for (int c = 0; c < cols; ++c) {
        if (grid[r][c] != '1') continue;
        ++count; queue<pair<int,int>> q; q.push({r,c}); grid[r][c] = '0';
        while (!q.empty()) { auto [x,y] = q.front(); q.pop();
            for (int d = 0; d < 4; ++d) { int a=x+dr[d], b=y+dc[d];
                if (a>=0 && a<rows && b>=0 && b<cols && grid[a][b]=='1') {
                    grid[a][b]='0'; q.push({a,b});
                }
            }
        }
    }
    return count;
}`,
    java: `int numIslands(char[][] grid) {
    int rows = grid.length, cols = grid[0].length, count = 0;
    int[][] dirs = {{1,0},{-1,0},{0,1},{0,-1}};
    for (int r=0; r<rows; r++) for (int c=0; c<cols; c++) {
        if (grid[r][c] != '1') continue;
        count++; Queue<int[]> q = new ArrayDeque<>(); q.offer(new int[]{r,c}); grid[r][c]='0';
        while (!q.isEmpty()) { int[] p=q.poll();
            for (int[] d : dirs) { int x=p[0]+d[0], y=p[1]+d[1];
                if (x>=0 && x<rows && y>=0 && y<cols && grid[x][y]=='1') {
                    grid[x][y]='0'; q.offer(new int[]{x,y});
                }
            }
        }
    }
    return count;
}`,
    python: `from collections import deque

def num_islands(grid):
    rows, cols = len(grid), len(grid[0])
    islands = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] != "1":
                continue
            islands += 1
            grid[r][c] = "0"
            queue = deque([(r, c)])
            while queue:
                x, y = queue.popleft()
                for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
                    a, b = x + dx, y + dy
                    if 0 <= a < rows and 0 <= b < cols and grid[a][b] == "1":
                        grid[a][b] = "0"
                        queue.append((a, b))
    return islands`
  },
  'Advanced Graphs': {
    problem: 'Course Schedule',
    complexity: 'O(V + E) time and O(V + E) space.',
    cpp: `bool canFinish(int n, vector<vector<int>>& prerequisites) {
    vector<vector<int>> graph(n);
    vector<int> indegree(n);
    for (auto& edge : prerequisites) {
        graph[edge[1]].push_back(edge[0]);
        indegree[edge[0]]++;
    }
    queue<int> ready;
    for (int i = 0; i < n; ++i) if (!indegree[i]) ready.push(i);
    int taken = 0;
    while (!ready.empty()) {
        int course = ready.front(); ready.pop(); ++taken;
        for (int next : graph[course]) if (--indegree[next] == 0) ready.push(next);
    }
    return taken == n;
}`,
    java: `boolean canFinish(int n, int[][] prerequisites) {
    List<List<Integer>> graph = new ArrayList<>();
    for (int i = 0; i < n; i++) graph.add(new ArrayList<>());
    int[] indegree = new int[n];
    for (int[] edge : prerequisites) {
        graph.get(edge[1]).add(edge[0]);
        indegree[edge[0]]++;
    }
    Queue<Integer> ready = new ArrayDeque<>();
    for (int i = 0; i < n; i++) if (indegree[i] == 0) ready.offer(i);
    int taken = 0;
    while (!ready.isEmpty()) {
        int course = ready.poll(); taken++;
        for (int next : graph.get(course)) if (--indegree[next] == 0) ready.offer(next);
    }
    return taken == n;
}`,
    python: `from collections import deque

def can_finish(num_courses, prerequisites):
    graph = [[] for _ in range(num_courses)]
    indegree = [0] * num_courses
    for course, prereq in prerequisites:
        graph[prereq].append(course)
        indegree[course] += 1
    ready = deque(i for i, degree in enumerate(indegree) if degree == 0)
    taken = 0
    while ready:
        course = ready.popleft()
        taken += 1
        for next_course in graph[course]:
            indegree[next_course] -= 1
            if indegree[next_course] == 0:
                ready.append(next_course)
    return taken == num_courses`
  },
  '1-D DP': {
    problem: 'Climbing Stairs',
    complexity: 'O(n) time and O(1) extra space.',
    cpp: `int climbStairs(int n) {
    int one = 1, two = 1;
    for (int step = 2; step <= n; ++step) {
        int current = one + two;
        two = one;
        one = current;
    }
    return one;
}`,
    java: `int climbStairs(int n) {
    int one = 1, two = 1;
    for (int step = 2; step <= n; step++) {
        int current = one + two;
        two = one;
        one = current;
    }
    return one;
}`,
    python: `def climb_stairs(n):
    one = two = 1
    for _ in range(2, n + 1):
        one, two = one + two, one
    return one`
  },
  '2-D DP': {
    problem: 'Unique Paths',
    complexity: 'O(rows * columns) time and O(columns) extra space.',
    cpp: `int uniquePaths(int m, int n) {
    vector<int> dp(n, 1);
    for (int r = 1; r < m; ++r)
        for (int c = 1; c < n; ++c)
            dp[c] += dp[c - 1];
    return dp[n - 1];
}`,
    java: `int uniquePaths(int m, int n) {
    int[] dp = new int[n];
    Arrays.fill(dp, 1);
    for (int r = 1; r < m; r++)
        for (int c = 1; c < n; c++)
            dp[c] += dp[c - 1];
    return dp[n - 1];
}`,
    python: `def unique_paths(m, n):
    dp = [1] * n
    for _ in range(1, m):
        for col in range(1, n):
            dp[col] += dp[col - 1]
    return dp[-1]`
  },
  Greedy: {
    problem: 'Jump Game',
    complexity: 'O(n) time and O(1) extra space.',
    cpp: `bool canJump(vector<int>& nums) {
    int farthest = 0;
    for (int i = 0; i < nums.size() && i <= farthest; ++i) {
        farthest = max(farthest, i + nums[i]);
        if (farthest >= nums.size() - 1) return true;
    }
    return nums.size() == 1;
}`,
    java: `boolean canJump(int[] nums) {
    int farthest = 0;
    for (int i = 0; i < nums.length && i <= farthest; i++) {
        farthest = Math.max(farthest, i + nums[i]);
        if (farthest >= nums.length - 1) return true;
    }
    return nums.length == 1;
}`,
    python: `def can_jump(nums):
    farthest = 0
    for i, jump in enumerate(nums):
        if i > farthest:
            return False
        farthest = max(farthest, i + jump)
        if farthest >= len(nums) - 1:
            return True
    return len(nums) == 1`
  },
  Intervals: {
    problem: 'Merge Intervals',
    complexity: 'O(n log n) time for sorting and O(n) output space.',
    cpp: `vector<vector<int>> merge(vector<vector<int>>& intervals) {
    sort(intervals.begin(), intervals.end());
    vector<vector<int>> merged;
    for (auto& interval : intervals) {
        if (merged.empty() || merged.back()[1] < interval[0]) merged.push_back(interval);
        else merged.back()[1] = max(merged.back()[1], interval[1]);
    }
    return merged;
}`,
    java: `int[][] merge(int[][] intervals) {
    Arrays.sort(intervals, (a, b) -> Integer.compare(a[0], b[0]));
    List<int[]> merged = new ArrayList<>();
    for (int[] current : intervals) {
        if (merged.isEmpty() || merged.get(merged.size()-1)[1] < current[0])
            merged.add(current.clone());
        else merged.get(merged.size()-1)[1] = Math.max(merged.get(merged.size()-1)[1], current[1]);
    }
    return merged.toArray(new int[merged.size()][]);
}`,
    python: `def merge(intervals):
    intervals.sort()
    merged = []
    for start, end in intervals:
        if not merged or merged[-1][1] < start:
            merged.append([start, end])
        else:
            merged[-1][1] = max(merged[-1][1], end)
    return merged`
  },
  'Math & Geometry': {
    problem: 'Rotate Image',
    complexity: 'O(n²) time and O(1) extra space for an in-place square-matrix rotation.',
    cpp: `void rotate(vector<vector<int>>& matrix) {
    int n = matrix.size();
    for (int r = 0; r < n; ++r)
        for (int c = r + 1; c < n; ++c)
            swap(matrix[r][c], matrix[c][r]);
    for (auto& row : matrix) reverse(row.begin(), row.end());
}`,
    java: `void rotate(int[][] matrix) {
    int n = matrix.length;
    for (int r = 0; r < n; r++)
        for (int c = r + 1; c < n; c++) {
            int temp = matrix[r][c]; matrix[r][c] = matrix[c][r]; matrix[c][r] = temp;
        }
    for (int[] row : matrix)
        for (int l = 0, r = n - 1; l < r; l++, r--) {
            int temp = row[l]; row[l] = row[r]; row[r] = temp;
        }
}`,
    python: `def rotate(matrix):
    n = len(matrix)
    for row in range(n):
        for col in range(row + 1, n):
            matrix[row][col], matrix[col][row] = matrix[col][row], matrix[row][col]
    for row in matrix:
        row.reverse()`
  },
  'Bit Manipulation': {
    problem: 'Number of 1 Bits',
    complexity: 'O(number of set bits) time and O(1) extra space.',
    cpp: `int hammingWeight(uint32_t n) {
    int count = 0;
    while (n) {
        n &= (n - 1);
        ++count;
    }
    return count;
}`,
    java: `int hammingWeight(int n) {
    int count = 0;
    while (n != 0) {
        n &= (n - 1);
        count++;
    }
    return count;
}`,
    python: `def hamming_weight(n):
    count = 0
    while n:
        n &= n - 1
        count += 1
    return count`
  },
  Tries: {
    problem: 'Implement Trie (Prefix Tree)',
    complexity: 'O(L) per insert/search/prefix query, where L is the word length.',
    cpp: `struct Trie {
    struct Node { Node* next[26]{}; bool word = false; };
    Node* root = new Node();
    void insert(string s) {
        Node* node = root;
        for (char c : s) {
            int i = c - 'a';
            if (!node->next[i]) node->next[i] = new Node();
            node = node->next[i];
        }
        node->word = true;
    }
}`,
    java: `class Trie {
    static class Node { Node[] next = new Node[26]; boolean word; }
    private final Node root = new Node();
    public void insert(String s) {
        Node node = root;
        for (char c : s.toCharArray()) {
            int i = c - 'a';
            if (node.next[i] == null) node.next[i] = new Node();
            node = node.next[i];
        }
        node.word = true;
    }
}`,
    python: `class TrieNode:
    def __init__(self):
        self.children = {}
        self.is_word = False

class Trie:
    def __init__(self):
        self.root = TrieNode()
    def insert(self, word):
        node = self.root
        for char in word:
            node = node.children.setdefault(char, TrieNode())
        node.is_word = True`
  }
};

const topicGuides = {
  'Arrays & Hashing': {
    intro: 'Arrays store values in order; a hash map or set adds fast lookup by key. Together they turn many nested-search problems into a single pass.',
    cues: ['Find duplicates, counts, complements, or group items by a shared key.', 'The input is large enough that comparing every pair would be too slow.'],
    steps: ['Decide what information must be remembered from earlier elements.', 'Use a set for membership, a map for counts/indices, or a normalized key for grouping.', 'Check before inserting when the current item must pair with an earlier one.'],
    pitfalls: ['Clarify whether duplicate values are allowed.', 'For anagram keys, use a fixed-size frequency signature or sort consistently.', 'Prefix/suffix products can avoid division and handle zeros.']
  },
  'Two Pointers': {
    intro: 'Two indices move through a sequence while preserving a useful relationship. Sorted order often lets one pointer movement safely eliminate many candidates.',
    cues: ['The data is sorted, or the answer involves a pair/triplet or in-place filtering.', 'A left/right choice can be justified from the current comparison.'],
    steps: ['Place pointers at a meaningful starting boundary.', 'Evaluate the current pair and use the invariant to decide which pointer can move.', 'Skip repeated values when unique combinations are required.'],
    pitfalls: ['Explain why moving a pointer cannot skip a valid answer.', 'Use a wider integer type for pair sums where constraints require it.', 'Use a three-way duplicate skip for triplet enumeration.']
  },
  Stack: {
    intro: 'A stack represents the most recent unresolved item. A monotonic stack keeps values ordered so the next greater/smaller relationship can be answered efficiently.',
    cues: ['The task asks for matching brackets, undo/recent state, expression evaluation, or next greater/smaller values.', 'An item becomes solvable when a later item arrives.'],
    steps: ['Choose what the stack stores: values, indices, or partial states.', 'For monotonic problems, define increasing or decreasing order from the comparison you need.', 'Resolve all newly answered items, then push the current item.'],
    pitfalls: ['Store indices when distance or original position is needed.', 'Decide carefully whether equal values should pop.', 'Unresolved stack entries often correspond to a default answer.']
  },
  'Binary Search': {
    intro: 'Binary search repeatedly removes half of a sorted search space. It also works on an answer range when feasibility changes monotonically.',
    cues: ['There is sorted structure, or a yes/no feasibility check flips only once.', 'A linear scan is possible but too slow for the input size.'],
    steps: ['State exactly what the left and right boundaries mean.', 'Compute the midpoint without overflow.', 'Update the boundary so the candidate space shrinks every iteration.'],
    pitfalls: ['Avoid mixing closed and half-open intervals.', 'For answer search, prove monotonicity and write a feasibility function.', 'Test empty, one-element, and boundary answers.']
  },
  'Sliding Window': {
    intro: 'A window is a contiguous range maintained as its endpoints move. Expand to include new data and shrink when the window violates a condition.',
    cues: ['The problem asks about a contiguous subarray or substring.', 'A growing range can be repaired by removing items from the left.'],
    steps: ['Track the state needed to test whether the current window is valid.', 'Extend the right edge once per input item.', 'Move the left edge until the invariant is restored, then update the answer.'],
    pitfalls: ['Use a while loop when multiple left moves may be required.', 'Keep a count of distinct or required items rather than rescanning the window.', 'Some problems use fixed-size windows; add and remove one item each step.']
  },
  'Linked List': {
    intro: 'Linked lists are about pointer invariants rather than random access. A small set of carefully named pointers prevents losing access to the rest of the list.',
    cues: ['Nodes must be rearranged, traversed from both ends, or checked for cycles.', 'The structure changes without shifting array elements.'],
    steps: ['Draw the links before changing them.', 'Save the next node before overwriting a pointer.', 'Use a dummy node when the head may be removed or replaced.'],
    pitfalls: ['Handle an empty list and a one-node list.', 'Move fast and slow pointers at a deliberate pace.', 'For in-place reversal, keep previous, current, and next references.']
  },
  Trees: {
    intro: 'Tree recursion decomposes a problem into subtrees. Each recursive call should have a clear input, return value, and base case.',
    cues: ['The question asks about paths, depth, ancestry, subtree structure, or level order.', 'The same operation can be expressed for a node using its children.'],
    steps: ['Define what a recursive call returns to its parent.', 'Handle the null node as the base case.', 'Combine child results and update any global answer only when needed.'],
    pitfalls: ['Distinguish a root-to-leaf path from any path.', 'For BSTs, use ordering bounds rather than checking only parent-child pairs.', 'Use a queue for level-order traversal and capture the level size first.']
  },
  'Heap / Priority Queue': {
    intro: 'A heap maintains fast access to one extreme while allowing efficient insertions and removals. A size-k heap is useful when only the top or bottom k items matter.',
    cues: ['Repeatedly select the next smallest/largest item.', 'The full sort is unnecessary because only a few ranked values are needed.'],
    steps: ['Choose min-heap or max-heap based on the item to discard.', 'Keep the heap bounded when k is small.', 'For merging sorted streams, push the next candidate from the stream you remove.'],
    pitfalls: ['State what the heap root represents after every update.', 'Compare squared distances when square roots are unnecessary.', 'Remember heap operations are logarithmic, not constant time.']
  },
  Backtracking: {
    intro: 'Backtracking explores a decision tree. Build one partial candidate, recurse, then undo the choice so the next branch starts clean.',
    cues: ['The output is a set of combinations, permutations, or valid arrangements.', 'The search space is exponential but can be pruned by constraints.'],
    steps: ['Define the recursive state and stopping condition.', 'Loop over legal next choices.', 'Choose, recurse, and undo; prune as soon as a constraint fails.'],
    pitfalls: ['Copy a path when saving it.', 'Skip equal values at the same recursion depth when unique combinations are required.', 'Do not confuse a global visited set with path-local state.']
  },
  Graphs: {
    intro: 'A graph models relationships between nodes. BFS explores by distance in unweighted graphs; DFS explores connected structure and recursive choices.',
    cues: ['The input describes connections, reachability, components, or a grid of adjacent cells.', 'The question asks whether a path exists or how many groups exist.'],
    steps: ['Choose an adjacency list or grid-neighbor representation.', 'Mark nodes visited when adding them to the worklist.', 'Run from one or every unvisited node depending on whether components matter.'],
    pitfalls: ['Mark on enqueue to avoid duplicates.', 'Handle disconnected components with an outer loop.', 'Check grid bounds before indexing.']
  },
  '1-D DP': {
    intro: 'One-dimensional dynamic programming stores the best answer for prefixes or positions. The recurrence should explain how the current state depends on earlier states.',
    cues: ['The problem asks for a count, minimum, maximum, or reachability over a sequence.', 'A decision at position i refers to a small set of earlier positions.'],
    steps: ['Write the meaning of dp[i] in one sentence.', 'Derive the recurrence from the final choice.', 'Set base cases, then evaluate in dependency order; compress space if only recent states are used.'],
    pitfalls: ['Check index bounds before reading previous states.', 'Separate impossible states from valid zero values.', 'Confirm whether dp indexes elements or prefix lengths.']
  },
  '2-D DP': {
    intro: 'Two-dimensional DP models two changing quantities, such as positions in two strings or row and column in a grid.',
    cues: ['The state needs two indices or two independent capacities.', 'The recurrence combines top/left neighbors or prefixes of two sequences.'],
    steps: ['Define dp[i][j] precisely, including whether indexes are inclusive.', 'Identify the final decision and its predecessor states.', 'Initialize the first row/column and fill in a valid order.'],
    pitfalls: ['Use an extra zero row/column to simplify boundaries when appropriate.', 'Check whether transitions read the old or already-updated row.', 'Compress memory only after validating iteration direction.']
  },
  Greedy: {
    intro: 'A greedy algorithm makes a locally optimal choice and commits. It is correct only when that choice can be justified by an exchange argument or a maintained invariant.',
    cues: ['The task asks for a minimum number of actions, maximum reach, or a schedule.', 'A sorted order exposes a safe choice at each step.'],
    steps: ['Identify the local choice and the invariant it preserves.', 'Prove that an optimal solution can be changed to include the choice.', 'Track only the state needed to make the next safe choice.'],
    pitfalls: ['Test a small counterexample before trusting a heuristic.', 'Sort by the property that supports the proof.', 'When choices interact globally, consider DP instead.']
  },
  Intervals: {
    intro: 'Interval problems become easier after sorting by a boundary. Then overlapping or adjacent ranges can be processed with a small amount of running state.',
    cues: ['Inputs are start/end pairs and ask about overlap, merging, insertion, or scheduling.', 'The order of intervals is not meaningful until you sort.'],
    steps: ['Choose the sorting boundary, usually start time.', 'Compare the current interval with the last active interval.', 'Merge, keep separate, or advance according to the exact overlap rule.'],
    pitfalls: ['Clarify whether touching endpoints count as overlap.', 'Copy intervals if later sorting must not mutate caller data.', 'For meeting-room counts, sorting starts and ends separately can simplify the sweep.']
  },
  'Math & Geometry': {
    intro: 'Math and geometry problems often hide a coordinate transform, invariant, or arithmetic property that avoids simulation.',
    cues: ['The task involves rotation, distances, divisibility, coordinates, or repeated arithmetic.', 'A formula or symmetry can replace many operations.'],
    steps: ['Write the transformation on a small example.', 'Look for symmetry, sign, parity, or a conserved quantity.', 'Use integer arithmetic where possible and guard multiplication overflow.'],
    pitfalls: ['Track coordinate conventions and rotation direction.', 'Normalize negative modulo results if the language requires it.', 'Use a wider integer type for squared values.']
  },
  'Bit Manipulation': {
    intro: 'Bit operations inspect or update binary flags compactly. XOR cancels equal pairs, and n & (n - 1) removes the lowest set bit.',
    cues: ['Values represent subsets/flags, or the prompt emphasizes XOR and binary representation.', 'The constraints suggest a compact state or a parity property.'],
    steps: ['Write a small binary example for each operation.', 'Use masks to test, set, clear, or toggle one bit.', 'Check whether inputs are signed and what width the problem assumes.'],
    pitfalls: ['Shifting into a sign bit can behave differently across languages.', 'Use unsigned values when the contract requires fixed-width bit behavior.', 'Do not assume a value is nonnegative unless constraints say so.']
  },
  Tries: {
    intro: 'A trie stores strings by shared prefixes. Each edge represents one character and each node can mark the end of a complete word.',
    cues: ['The task asks for prefix search, dictionary lookup, or many words sharing starts.', 'Repeatedly scanning every stored word would be wasteful.'],
    steps: ['Create a child transition for each character encountered.', 'Mark terminal nodes separately from nodes that are only prefixes.', 'Walk the same transitions for exact search or prefix search.'],
    pitfalls: ['A prefix can exist without being a complete word.', 'Choose a child structure suited to the alphabet.', 'Account for memory proportional to total inserted characters.']
  },
  'Advanced Graphs': {
    intro: 'Advanced graph patterns include topological ordering, shortest paths, and disjoint sets. Choose the tool based on edge weights and dependency structure.',
    cues: ['The graph is directed and describes prerequisites, or shortest path costs matter.', 'Cycles or reachability through weighted edges must be detected.'],
    steps: ['For prerequisites, compute indegrees and run Kahn’s queue algorithm.', 'For nonnegative edge weights, use Dijkstra with a min-priority queue.', 'Ignore stale heap entries and compare the processed count to detect cycles.'],
    pitfalls: ['BFS gives shortest paths only when all edges have equal weight.', 'Topological ordering exists only for a DAG.', 'Use a sufficiently wide type for accumulated path costs.']
  }
};

Object.entries(examples).forEach(([topic, example]) => {
  topicGuides[topic].example = example;
});

export default topicGuides;
