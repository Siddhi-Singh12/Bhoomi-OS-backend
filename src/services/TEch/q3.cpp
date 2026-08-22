#include <bits/stdc++.h>
using namespace std;

int main() {

    string s = "ababdabdcba";
    int n = s.size();
    int ans = 0;

    for(int k = 1; k <= 26; k++) {

        vector<int> freq(26, 0);

        int i = 0;
        int distinct = 0;
        int atleastTwo = 0;

        for(int j = 0; j < n; j++) {

            int x = s[j] - 'a';

            if(freq[x] == 0)
                distinct++;

            freq[x]++;

            if(freq[x] == 2)
                atleastTwo++;

            // Window mein k se zyada distinct characters
            while(distinct > k) {

                int y = s[i] - 'a';

                if(freq[y] == 2)
                    atleastTwo--;

                freq[y]--;

                if(freq[y] == 0)
                    distinct--;

                i++;
            }

            // Har distinct character ki frequency >= 2
            if(distinct == k && atleastTwo == k) {
                ans = max(ans, j - i + 1);
            }
        }
    }

    cout << ans;
}