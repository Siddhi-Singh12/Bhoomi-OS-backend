#include<iostream>
#include<vector>
#include<unordered_map>
using namespace std;

int main(){
    vector<int>nums={0,1,1,1,1,1,0,0,0};
    int n=nums.size();
    int i=0;
    int j=0;
    int count=0;
    unordered_map<int,int>mp;
    for(int i=0;i<n;i++){
        int j=i;
        while(j<n){
            mp[nums[j]]++;
            if(mp[1]==mp[0]){
                count=max(count,j-i+1);
            }
            j++;

        }
        mp[1]=0;
        mp[0]=0;
    }
    cout<<count;

}