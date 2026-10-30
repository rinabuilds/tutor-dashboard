const LEVEL_MAXIMUMS = {
  P1: 20,
  P2: 100,
  P3: 1000,
  P4: 10000,
  P5: 100000,
  P6: 1000000,
}

const OPERATION_CHOICES = ['Addition', 'Subtraction', 'Both']

function randomInteger(maximum, random) {
  return Math.floor(random() * (maximum + 1))
}

function createQuestion(number, operation, maximum, random) {
  if (operation === 'Addition') {
    const leftOperand = randomInteger(maximum, random)
    const rightOperand = randomInteger(maximum - leftOperand, random)

    return {
      number,
      leftOperand,
      operator: '+',
      rightOperand,
      answer: leftOperand + rightOperand,
    }
  }

  const leftOperand = randomInteger(maximum, random)
  const rightOperand = randomInteger(leftOperand, random)

  return {
    number,
    leftOperand,
    operator: '-',
    rightOperand,
    answer: leftOperand - rightOperand,
  }
}

export function generateWorksheet(level, operationChoice, random = Math.random) {
  const maximum = LEVEL_MAXIMUMS[level]

  if (maximum === undefined) {
    throw new RangeError(`Unsupported primary level: ${level}`)
  }

  if (!OPERATION_CHOICES.includes(operationChoice)) {
    throw new RangeError(`Unsupported operation choice: ${operationChoice}`)
  }

  return Array.from({ length: 5 }, (_, index) => {
    const operation = operationChoice === 'Both'
      ? (random() < 0.5 ? 'Addition' : 'Subtraction')
      : operationChoice

    return createQuestion(index + 1, operation, maximum, random)
  })
}