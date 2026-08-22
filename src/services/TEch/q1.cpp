#include<iostream>
#include<vector>
using namespace std;

int main(){
    vector<int>nums={1,3,-5,5,6,-4};
    int n=nums.size();

    int m=3;
    int maxProd=INT_MIN;
    for(int i=0;i<n;i++){
        int j=i+m;
        if(j<n){
            maxProd=max(maxProd,nums[i]*nums[j]);
        }
        else{
            break;
        }
    }
    cout<<maxProd;
}