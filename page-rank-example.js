const {Matrix} = require("ml-matrix");

//Transition probability matrix
//Note: just a 2D array containing rows
let P = new Matrix([[1/6, 2/3, 1/6], [5/12, 1/6, 5/12], [1/6, 2/3, 1/6]]);
//Initial PageRank vector
let x0 = new Matrix([[1, 0, 0]]);

//Power iteration
//In real application, exit after difference
//between x_t and x_t+1 are below some threshold
for(let i = 0; i < 25; i++){
  console.log("Iteration #" + i);
  console.log(x0);
  x0 = x0.mmul(P);
}



/*
The challenges:
1. Generating an adjacency matrix from your crawled data
2. Performing the initial set up
3. Implementing the stopping condition
*/
