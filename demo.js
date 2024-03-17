const { Matrix } = require('ml-matrix');

let a = new Matrix([[0, 0.5, 0.5, 0.5],
                    [0.5, 0, 0, 0.5],
                    [0.5, 0, 0, 0],
                    [0, 0.5, 0.5, 0]])

// console.log(a)

let b = new Matrix(
    [[0.25], [0.25], [0.25], [0.25]]
)

let res = a.mmul(b)

// console.log(res)


let c = Matrix.zeros(3,3)
let d = Matrix.zeros(3,3)

c.data[0][0] = [3]
d.data[0][0] = [3]
let cal1 = c.mul(d)



console.log(cal1)