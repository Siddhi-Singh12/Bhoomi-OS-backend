#include<iostream>
#include<vector>
#include<unordered_map>
using namespace std;

bool f(vector<int>&nums,int i,int j){
    int d=nums[i]-nums[i+1];
    for(int i=0;i<=j;i++){
        int k=i+1;
        if(abs(nums[k]-nums[i])==d){
            continue;
        }
        else{
            return false;
        }
    }
    return true;
}

int main(){
    vector<int>nums={1,2,3,2};
    int n=nums.size();
    int i=0;
    int j=0;
    int count=0;
    for(int i=0;i<n;i++){
        while(j<n){
            if(f(nums,i,j)&& j-i>=3){
                count++;
            }
            j++;
        }

    }
    cout<<count;
}