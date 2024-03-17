const { Matrix } = require('ml-matrix');


// convert matrix to probability matrix
function tran_and_convert(matrix){
    // init 1000 * 1000 matrix
    let len = 4;
    // console.log(len)
    let result = Matrix.zeros(len, len)
    let result_convert = Matrix.zeros(len, len)
    for(let i=0; i<len; i++){
        let sum = 0
        for (let k=0; k<len; k++){
            // console.log(matrix.data[i][k])
            sum += matrix.data[i][k]
        }
        for(let j=0; j<len; j++){
            // cal average
            result.data[i][j] = (matrix.data[i][j] * 1.0) / sum
        }
    }
    for(let i=0; i<len; i++){
        for(let j=0; j<len; j++){
            result_convert.data[i][j] = result.data[j][i]
        }
    }
    return result_convert
}

// cal pageRank rate
function page_rank(A){
    let pageNum = 4;
    let alpha = 0.85
    let delta = 0.0001
    let norm = 100

    let new_rank = Matrix.zeros(pageNum, 1)

    for(let i=0; i<pageNum; i++){
        // new_rank.data[i][0] = [1/pageNum]
        new_rank.data[i][0] = [Math.random()]
    }

    let r = Matrix.zeros(pageNum,1)

    for(let i=0; i<pageNum; i++){
        // console.log('tt' + (1 - alpha) / pageNum)
        r.data[i][0] = [(1 - alpha) / pageNum]
    }

    // console.log('r', r)
    // console.log('new_rank', new_rank)

    let rank = Matrix.zeros(pageNum,1)

    while(norm > delta){
        rank = new_rank
        let cal1 = A.mmul(rank)
        let cal2 = Matrix.mul(cal1, alpha)
        new_rank = Matrix.add(r, cal2)
        // console.log('r2' , r)
        // compare norm
        norm = 0
        for(let i=0; i<pageNum; i++){
            // console.log(new_rank.data[0][i] + "-" + rank.data[0][i])
            norm += Math.abs(new_rank.data[i][0] - rank.data[i][0])
        }
        console.log('norm.' + norm)
        // console.log()
    }
    console.log(new_rank)
    return new_rank
}

let matrix = new Matrix([[0, 1, 1, 0],
                         [1, 0, 0, 1],
                         [1, 0, 0, 1],
                         [1, 1, 0, 0]])

let M = tran_and_convert(matrix)

// console.log(M)

page_rank(M)

