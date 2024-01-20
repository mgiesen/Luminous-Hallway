function transformMatrix(arr, rows, cols, flip_x, flip_y)
{
    const result = new Uint8Array(rows * cols * 3);
    for (let col = 0; col < cols; col++)
    {
        for (let row = 0; row < rows; row++)
        {
            let sourceCol = flip_x ? cols - 1 - col : col;
            let alternateRow = sourceCol % 2 === 0 ? row : rows - 1 - row;
            let sourceRow = flip_y ? rows - 1 - alternateRow : alternateRow;

            for (let i = 0; i < 3; i++)
            {
                result[(col * rows + row) * 3 + i] = arr[(sourceRow * cols + sourceCol) * 3 + i];
            }
        }
    }
    return result;
}

module.exports = transformMatrix;