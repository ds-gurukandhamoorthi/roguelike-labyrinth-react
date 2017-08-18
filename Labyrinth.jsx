const minSize = 8;
const roomSize = 4;
const visibRadius = 6;

 const weapons = [{
     name: 'knife',
     attackingPower : 4, //right now this is not taken into account.
 },
     {
         name:'axe',
         attackingPower: 7,
     },
     {name: 'spear',
         attackingPower: 9,
     },
     {name: '04 weap',
         attackingPower: 9,
     }
 
 ]



// createMatrix :: Number -> Number -> ([Number ,Number] -> a) -> [[a]]
const createMatrix =(nbRow, nbCol, func) =>{
    if(nbRow <=0 || nbCol <= 0){
        return [];
    }
    const rowIndexes = R.range(0,nbRow);
    const colIndexes = R.range(0,nbCol);
    const matrixIndexes = R.xprod(rowIndexes, colIndexes);
    const funcResult = R.map(func,matrixIndexes);
    return R.splitEvery(nbCol)(funcResult);
};

//  x<=y
//inBetween :: Ord a => a -> a -> a -> Boolean
//inBetween(3,6) (5) -> false     CAUTION: Do not use as inBetween([3,10], [3,5]) NO DON'T
const inBetween = (a,b) =>{
    if(a > b){
        return inBetween(b,a);
    }
    return R.both(R.lte(a), R.gte(b));
};
//inBetweenList([2,3],[4,6])([2,5])
//inBetweenList :: [Number] -> [Number] -> [Number] -> Boolean
//inBetweenList :: Ord a => [a] -> [a] -> [a] -> Boolean
const inBetweenCoords = (coord1,coord2) =>{
    const everythingTrue = R.reduce(R.and,true);
    const comparisonPredicate = R.zipWith(inBetween, coord1, coord2);
    const appliedComparaisonPredicate=R.zipWith(R.call,comparisonPredicate);
    return R.pipe(appliedComparaisonPredicate,everythingTrue);
};

//very much like R.range (with order of parameters made irrelevant, and the upper bound being included)
//integersInBetweenBounds :: Number -> Number -> [Number]
const integersInBetweenBounds = (a,b) => R.range(R.min(a,b),R.max(a,b)+1);

//coordinatesInBetweenBounds :: [Number, Number] -> [Number, Number] -> [[Number,Number]]
const coordinatesInBetweenBounds=(coord1, coord2) => { //coordinates in the rectangle delimited by coord1 and coord2 : Only integer coordinates
    const [x1,y1] = coord1;
    const [x2,y2] = coord2;
    const rangeXs = integersInBetweenBounds(x1,x2);
    const rangeYs = integersInBetweenBounds(y1,y2);
    return R.xprod(rangeXs,rangeYs);
};

//boxLens :: [Number, Number] -> [Number, Number] -> R.lens
const boxLens=(coord1, coord2) => {
    const coords =  coordinatesInBetweenBounds(coord1, coord2);
    return lensOfIndices(coords);
};

//lensOfIndices :: [[Number,Number]] -> R.lens
const lensOfIndices=(coords) => R.lens(getValueAtIndices(coords), setValueAtIndices(coords));

//getValueAtIndices :: [[Integer, Integer]] -> [[a]] -> [a]
const    getValueAtIndices=(coords) => {
    //const getValueAtCoord = coord => R.reduce(R.pipe, R.identity, R.map(R.nth,coord));
    const getValueAtCoord = coord => (R.pipe(R.nth(coord[0]),R.nth(coord[1])));
    const listOfGettingFuncs = R.map(getValueAtCoord, coords);
    return R.o(R.ap(listOfGettingFuncs), R.of);
};
const setValueAtIndices=R.curry((coords, values,matrix) => {
    let resMatrix =R.clone(matrix);
    const updateAt = (coord,value) => {
        const [x,y] =coord;
        resMatrix[x][y] = value;
    };
    coords.map((coord,i) => updateAt(coord, values[i]));
    return resMatrix;
});

//getBox :: [Integer, Integer] -> [Integer, Integer] -> [[a]] -> [a]
const getBox=(coord1,coord2)=>{
    const coords =  coordinatesInBetweenBounds(coord1, coord2);
    return getValueAtIndices(coords);
};

//setBox :: [Integer, Integer] -> [Integer, Integer] -> a -> [[a]] -> [[a]]
const setBox=(coord1,coord2,val)=>{
    const coords =  coordinatesInBetweenBounds(coord1, coord2);
    const vals = R.repeat(val,coords.length);
    return setValueAtIndices(coords, vals);
};



const dist = (a,b) => Math.abs(b-a);

const diminishBox=(coords, minSize)=>{
    const [coord1, coord2] = coords;
    const [l1,c1] = coord1;
    const [l2,c2] = coord2;
    const newLines = diminishInterval(l1,l2, minSize);
    const newColmns = diminishInterval(c1,c2, minSize);
    if(newLines === null || newColmns == null){
        return null;
    }
    const [l1_, l2_] = newLines;
    const [c1_, c2_] = newColmns;
    const coord1_ = [l1_, c1_];
    const coord2_ = [l2_, c2_];
    return [coord1_, coord2_];
};



const diminishInterval=(a,b, minDist)=>{
    //we expect some interval in [a+1,b+1] with at least a dist of minDist
    const a_ = a+1;
    const b_ = b-1;
    const dis = dist(a_,b_);
    const leeway = (dis > minDist) ? _.random(0, dis - minDist) : 0;
    const leftSideLeeway = _.random(0, leeway);
    const rightSideLeeway = leeway-leftSideLeeway;
    if((b_ -rightSideLeeway)-(a_-leftSideLeeway) >= minDist){
        return [a_ + leftSideLeeway, b_ - rightSideLeeway];
    }else{
        return null;
    }
};

const calcCorridor=(fromRoom, toRoom)=>{
    const getRange = R.juxt([Math.min, Math.max]);
    const getInterAndUnion = R.juxt([R.intersection, R.union]);
    const [[l1,c1],[l2,c2]] = fromRoom;
    const [[l3,c3],[l4,c4]] = toRoom;
    // console.log(fromRoom);
    // console.log(toRoom);
    const [commonLines, coveredLines] = getInterAndUnion(integersInBetweenBounds(l1,l2), integersInBetweenBounds(l3, l4));
    const [commonColumns, coveredColumns] = getInterAndUnion(integersInBetweenBounds(c1,c2), integersInBetweenBounds(c3, c4));
    if(commonLines.length > 0){
        const l = _.sample(commonLines);
        const [minColumn, maxColumn] = getRange(c1,c2,c3,c4);
        const allNeededColumns = integersInBetweenBounds(minColumn, maxColumn);
        const notCovered = R.difference(allNeededColumns, coveredColumns); 
        return [[l,R.apply(Math.min, notCovered)], [l,R.apply(Math.max,notCovered)]];
    }
    if(commonColumns.length > 0){
        // console.log('common columns');
        const c = _.sample(commonColumns);
        const [minLine,maxLine] = getRange(l1,l2,l3,l4);
        const allNeededLines = integersInBetweenBounds(minLine, maxLine);
        const notCovered = R.difference(allNeededLines, coveredLines); 
        return [[R.apply(Math.min, notCovered) , c], [R.apply(Math.max,notCovered),c]];

    }
    return null; //here we must write code for a `L` shaped corridor. `l`
};

const corridorLength = (corridor)=>{
    const [[a,b],[c,d]] = corridor;
    const square = x=> x*x;
    const distSquare=(x,y)=> square(dist(x,y));
    return Math.sqrt(distSquare(a,c) + distSquare(b,d));
};

const distBetweenCoords = (coord1, coord2) => {
    const [a,b] = coord1;
    const [c,d] = coord2;
    const square = x=> x*x;
    const distSquare=(x,y)=> square(dist(x,y));
    return Math.sqrt(distSquare(a,c) + distSquare(b,d));
}

const randomPoint = (room)=>{
    const [[l1,c1],[l2,c2]] = room;
    return [_.random(l1,l2),_.random(c1,c2)];
};

const PLAYER = 'PLAYER';
const HEALTH = 'HEALTH';
const ENEMY = 'ENEMY';
const EXIT = 'EXIT';
const WEAPON = 'WEAPON';

const colors = {
    PLAYER : 'blue',
    HEALTH : 'green',
    ENEMY : 'red',
    EXIT : 'purple',
    WEAPON : 'orange',
}
const Cell=(props)=>{
    const {i, j, cellSize, occupiedBy, isWall, playerCoord} = props;
    console.log(playerCoord);
    const isVisible= distBetweenCoords([j,i], playerCoord) < visibRadius;
    const colr = isWall ? 'gray' : R.propOr('white', occupiedBy, colors);
    // console.log(colr);
     return <rect x={i*cellSize} y={j*cellSize} width={cellSize} height={cellSize} fill={isVisible? colr : 'black'} stroke='gray'/>
}

const HorizCells=(props)=>{
    const {j, cellSize, nbCol, lineInfo, playerCoord} = props;
    // console.log('line Info = ' + lineInfo);
    return (
        <g>
            {
                R.range(0,nbCol).map((i)=>{
                    return <Cell
                        key={i}
                        i={i}
                        j={j}
                        cellSize={cellSize}
                        occupiedBy={lineInfo[i].occupiedBy}
                        isWall={lineInfo[i].isWall}
                        playerCoord={playerCoord}
                    />
                })
            }
        </g>
    );
}

const Matrix=(props)=>{
    const {cellSize, nbCol, nbRow, matrixInfo, playerCoord} = props;
    // console.log("Matrix info = "  + matrixInfo);
    // console.log("Matrix info[0] = "  + matrixInfo[0]);
    return (
        <g>
            {
                R.range(0,nbRow).map((j)=>{
                    return <HorizCells
                        key={j}
                        j={j}
                        cellSize={cellSize}
                        nbCol={nbCol}
                        lineInfo={matrixInfo[j]}
                        playerCoord={playerCoord}
                    />
                })
            }
        </g>
    );
}

var Node =function(left,right,val){
    this.left=left;
    this.right=right;
    this.val=val
    this.realBoxCoordinates=null; //this is what we would draw in the diagram
    this.childrenAreConnected=false; //this tells us if we can draw corridors between this and siblings
    this.corridors = [];
    this.takenCareOf = false;
}


const splittable= (coord1,coord2) => dist(coord1[0],coord2[0]) > minSize && dist(coord1[1],coord2[1])  > minSize

//FIXME: we suppose top-left and bottom-right corners
//FIXME: There is a whole lot of confusion between line-column and maths-like x-y
var splitVertically=(coords)=>{
    const [coord1, coord2] = coords;
    const [l1,c1] = coord1;
    const [l2,c2] = coord2;
    const c = _.random(c1+1, c2-1);
    return ([ [coord1, [l2,c]], [[l1,c+1], coord2]]);
}
var splitHorizontally=(coords)=>{
    const [coord1, coord2] = coords;
    const [l1,c1] = coord1;
    const [l2,c2] = coord2;
    const l = _.random(l1+1, l2-1);
    return ([ [coord1, [l,c2]], [[l+1,c1], coord2]]);
}


var split=(node)=>{
    const {val : coords} = node;
    const [coord1, coord2] = coords;
    if(splittable(coord1,coord2)){
        const [newCoord1, newCoord2] = (_.random(0,1)==1 ? splitHorizontally(coords) : splitVertically(coords));    
        node.left= new Node(null,null,newCoord1);
        split(node.left);
        node.right= new Node(null,null,newCoord2);
        split(node.right);
    }
    return node;
}



var fill=(node)=>{
    const {left,right,val:coords} = node;
    if(left===null && right===null){
        // console.log(coords);
        // console.log( diminishBox(coords,roomSize));
        node.realBoxCoordinates=diminishBox(coords,roomSize);
    }else{
        fill(left);
        fill(right);
    }
}



// root.left.realBoxCoordinates;

var fillMatrixWith=(node, matrix)=>{
    let resMatrix=R.clone(matrix);
    const {left,right,realBoxCoordinates:coords} = node;
    if(coords!==null){
        // console.log(node.val);
        // console.log(coords);
        const [coord1, coord2] = coords;
        resMatrix=setBox(coord1,coord2,1)(resMatrix)
    }else{
        if(left !== null){
            resMatrix=fillMatrixWith(left,resMatrix);
        }
        if(right!==null){
            resMatrix=fillMatrixWith(right,resMatrix);
        }
    }
    return resMatrix;
}
var paveCorridors =(node, matrix)=>{
    if(node === null){
        return matrix;
    }
    let resMatrix=R.clone(matrix);
    const {left,right,corridors} = node;
    if( corridors != null && corridors != []){
        for(let i = 0; i < corridors.length; i++){
            // console.log(corridors[i]);
            const [coord1, coord2] = corridors[i];
            resMatrix=setBox(coord1,coord2,1)(resMatrix)
        }
    }
    resMatrix=paveCorridors(left, resMatrix);
    resMatrix=paveCorridors(right, resMatrix);
    // console.log("end paving");
    return resMatrix
}

const depth=(node)=>{
    if(node === null){
        return 0;
    }
    return Math.max(depth(node.left) + 1, depth(node.right) + 1);
}

const depthOfnode=(root, noc)=>{//noc == node of concern
    if(root === noc || root.left === null || root.right === null){
        return 0;
    }
    return Math.max(depthOfnode(root.left, noc) + 1, depthOfnode(root.right, noc) + 1)
};

const findParent=(root, noc)=>{//noc == node of concern
    if(root === noc || root.left === null || root.right === null){
        return null;
    }
    if(root.left === noc || root.right === noc){
        return root;
    }
    return findParent(root.left, noc) || findParent(root.right, noc);
}

const findPath =(root, noc, path) => {//noc == node of concern

    if(root=== noc){
        return path
    }
    if( root.left === null || root.right === null){
        return "";
    }
    const lftPath = findPath(root.left, noc, path + "l");
    const rightPath = findPath(root.right, noc, path + "r");
    return lftPath + rightPath;
}
const nodeOfPath = (root, path)=>{
    if(path===""){
        return root;
    }
    if(path.charAt(0)==='l'){
        return nodeOfPath(root.left, path.substr(1));
    }
    if(path.charAt(0)==='r'){
        return nodeOfPath(root.right, path.substr(1));
    }
}



const nodesList = (node) => {
    if(node === null){
        return [];
    }
    const lft = nodesList(node.left);
    const right = nodesList(node.right);
    return lft.concat([node]).concat(right);
}


const isContainerOfRooms =(node)=>node.realBoxCoordinates ===null;
const isRoom = (node) => node.realBoxCoordinates !==null;
const connectTwoRooms=(nodecommon, from, to)=>{
    console.log("connecting real rooms... ) " + from.realBoxCoordinates + " " + to.realBoxCoordinates);
    let res = calcCorridor(from.realBoxCoordinates, to.realBoxCoordinates);
    if(res !== null && res.length>0){
        console.log("pushing corridor  " + res);
        nodecommon.corridors.push(res);
        from.takenCareOf = true;
        to.takenCareOf= true;
    }
    return nodecommon;
}
const connectByPath=(root,fromPath,toPath)=>{
    const commonPrefix = fromPath.substr(0,lengthCommonPrefix(fromPath,toPath));
    const commonPath = nodeOfPath(root,commonPrefix);
    const from = nodeOfPath(root,fromPath);
    const to = nodeOfPath(root,toPath);
    connectTwoRooms(commonPath,from,to);
}
const connectRoomsOfSameParent =(root) =>{
    const nodes = nodesList(root);
    const roomsOnly = nodes.filter(x=>x.realBoxCoordinates!==null)
    const paths=R.map(x=>findPath(root,x, ""), roomsOnly)
    //FIXME : we suppose they are sorted
    const pathsSorted = R.sort(x=>x.length, paths);
    const pairs = pathsSorted.map(p => [p, nodeOfPath(root,p)]);
    const nodeOf = R.fromPairs(pairs);
    // const nodesSorted = R.map(p => nodeOfPath(root, p), pathsSorted);


    const connect=(pathsSorted) => { 
        if(pathsSorted.length <= 1){
            return;
        }
        console.log('now pathsSorted ' + pathsSorted);
        const [rest, onePath] = [R.init(pathsSorted), R.last(pathsSorted)];
        let secondPath = '';
        let oneNode = nodeOf[onePath];
        for(let i =0, prevLen= Infinity;i<rest.length;i++){
            const node = nodeOf[rest[i]]; 
            const corridor = calcCorridor(oneNode.realBoxCoordinates, node.realBoxCoordinates);
            let newLen = -1;
            if(corridor !== null && corridor.length>0){
                newLen = corridorLength(corridor) ;
            }
            if(newLen > 0 && newLen < prevLen){
                prevLen = newLen;
                secondPath = rest[i];
            }
        };
        if(secondPath !== ''){
            connectByPath(root, onePath, secondPath);
            if(pathsSorted.length >= 2){
                connect(R.init(pathsSorted));
            }

        }else{
            console.log('Error calculating second path in connectRoomsOfSameParent');
            console.log(pathsSorted);
            console.log(onePath);
            console.log(nodeOf[onePath]);
            console.log(nodeOf[onePath].takenCareOf);
            if(nodeOf[onePath].takenCareOf){
                connect(R.init(pathsSorted));
            }
            return;
        }
    }
    connect(pathsSorted);

}

const lengthCommonPrefix=(a,b)=>{
    if(a==='' || b === ''){
        return 0;
    }
    if(R.head(a)!==R.head(b)){
        return 0;
    }
    return 1+lengthCommonPrefix(R.tail(a), R.tail(b));

}


const createCorridorsAll = (root, from, to )=>{
    if(root.childrenAreConnected){
        return root;
    }
    if(from === null || to === null){
        root.childrenAreConnected = true;
        return root;
    }
    if(!from.childrenAreConnected){
        from = createCorridorsAll(from, from.left, from.right);
    }
    if(!to.childrenAreConnected){
        to = createCorridorsAll(to, to.left, to.right);
    }
    if(from.realBoxCoordinates !== null && to.realBoxCoordinates !== null){
        root = connectTwoRooms(root, from,to);
    }
    if(isContainerOfRooms(from)){
        root = createCorridorsAll(root, from.left, to);
        root = createCorridorsAll(root, from.right, to);
        return root;
    }
    if(isContainerOfRooms(to)){
        root = createCorridorsAll(root, from, to.left);
        root = createCorridorsAll(root, from, to.right);
        return root;
    }

}

const createPlayground=(nbLines, nbCols)=>{
    const nbHealth = 4;
    const nbEnemies = 4;
    const nbWeapons = 4;
    const randomRoom= ()=> _.sample(roomsOnly);
    const randomPlacement=() => randomPoint(randomRoom().realBoxCoordinates);

    var c= createMatrix(nbLines,nbCols,x=>0)
    var root = new Node(null, null,[[0,0],[nbLines-1,nbCols-1]])
    split(root)
    fill(root)
    c=fillMatrixWith(root,c)
    c=paveCorridors(root, c);
    //matrPrint(c)
    connectRoomsOfSameParent(root);
    c=paveCorridors(root, c);
    const nodes = nodesList(root);
    const roomsOnly = nodes.filter(x=>x.realBoxCoordinates!==null)
        const enemies=R.times(x=>randomPlacement(),nbEnemies);
        const health=R.times(x=>randomPlacement(),nbEnemies);
        const weapons=R.times(x=>randomPlacement(),nbWeapons);
        const player=randomPlacement();
        const exit=randomPlacement();
    const calcOccupancy=([x,y])=>{
        if(R.equals([x,y], player)){
            return PLAYER;
        }
        if(R.equals([x,y], exit)){
            return EXIT;
        }
        if(R.contains([x,y], enemies)){
            return ENEMY;
        }
        if(R.contains([x,y], weapons)){
            return WEAPON;
        }
        if(R.contains([x,y], health)){
            return HEALTH;
        }

    };
    const info =([x,y])=> {
        return {
            isWall:c[x][y]==1?false:true,
            occupiedBy : calcOccupancy([x,y]),
        }
    }

    let matrixInfo = createMatrix(nbLines, nbCols,info);
    let playerCoord=player;

    //matrPrint(c)
    return{matrixInfo, playerCoord};
        


}


var rowPrint = r => r.join('');
var matrPrint = m => console.log(m.map(rowPrint).join('\n'));

// nodes = nodesList(root);
// roomsOnly = nodes.filter(x=>x.realBoxCoordinates!==null)
// console.log(nodes.length);
// console.log(roomsOnly.length);
// r=R.map(x=>depthOfnode(root,x), roomsOnly)
// prnt=R.map(x=>findParent(root,x), roomsOnly)
// console.log(r);
// console.log(depthOfnode(root, roomsOnly[0]));
//roomsOnly.map(x=>console.log(findParent(root,x)))
// p=R.map(x=>findPath(root,x, ""), roomsOnly)
// console.log(p);
// console.log(findPath(root, roomsOnly[0], ""));
// console.log(findPath(root, roomsOnly[1], "000"));
// console.log(roomsOnly[0]);
// console.log(roomsOnly[1]);
// console.log(roomsOnly[0]==roomsOnly[1]);



// console.log("*****")
// console.log(roomsOnly[1]);
//     console.log(a=findPath(root, roomsOnly[1], ""));
// console.log(nodeOfPath(root, a));
// const plygrnd = createPlayground(25,50);
// console.log(plygrnd.enemies);
// console.log(plygrnd.health);
// console.log(plygrnd.player);
// console.log(plygrnd.matrixInfo);
// console.log(plygrnd.matrixInfo[0][0].isWall);

class Labyrinth extends React.Component{
    constructor(props){
        super(props);
        const [height, width] = [600,800];
        const cellSize=20;
        const [nbCol, nbRow] = [height,width].map(x=>x/cellSize);
        const playGround = createPlayground(nbCol,nbRow);
        const health = 100;
        const level = 1;
        const weaponIndex = 0;
        const nextLevelAtXP = 60;
        this.state = {
            height,
            width,
            cellSize,
            matrixInfo:playGround.matrixInfo,
            playerCoord:playGround.playerCoord,
            nbCol,
            nbRow,
            health,
            level,
            weaponIndex,
            nextLevelAtXP,
        };
        this.handleKeyEvent=this.handleKeyEvent.bind(this);
        this.moveLineColumn=this.moveLineColumn.bind(this);
        this.newDungeon=this.newDungeon.bind(this);
        
        
        
    }
    componentDidMount() {
        window.addEventListener('keydown', this.handleKeyEvent);
    }
    moveLineColumn(line, column){
        const {matrixInfo} = this.state;
        const newMatrInfo = R.clone(matrixInfo);
        console.log(this.state.playerCoord);
        const [pl,pc] = this.state.playerCoord; //player line column
        console.log(pl + ' ' +pc);
        const {nbCol, nbRow} = this.state;
        console.log(nbCol + ' ' + nbRow);
        const [npl, npc]=[pl + line, pc + column]; //new pl pc
        if(npl < 0 || npc > nbRow -1){
            return;
        }
        if(npc < 0 || npl > nbCol -1){
            return;
        }
        if(matrixInfo[npl][npc].isWall){
            return;
        }
        const occupy=()=>{
            newMatrInfo[pl][pc].occupiedBy=undefined;
            newMatrInfo[npl][npc].occupiedBy=PLAYER;
        }
        if(matrixInfo[npl][npc].occupiedBy === HEALTH){
            const {health} = this.state;
            occupy();
            this.setState({
                health: health + 20,
                playerCoord: [npl, npc],
                matrixInfo : newMatrInfo,
            });
            return;
        }
        if(matrixInfo[npl][npc].occupiedBy === EXIT){
            return this.newDungeon();
        }
        if(matrixInfo[npl][npc].occupiedBy === WEAPON){
            const {weaponIndex} = this.state;
            occupy();
            this.setState({
                weaponIndex: weaponIndex+(Math.random()<0.3?1:0),
                playerCoord: [npl, npc],
                matrixInfo : newMatrInfo,
            });
            return;
        }
        if(matrixInfo[npl][npc].occupiedBy === ENEMY){
            const {health, level, nextLevelAtXP} = this.state;
            const newHealth = health -(5*level);
            const playerLoses = Math.random()<0.6;
            if(newHealth < 20){
                this.setState({
                    health:100,
                    level:1,
                });
                return this.newDungeon();
            }
            if(playerLoses){
                this.setState({
                    health : newHealth,
                });
                return;
            }else{
                occupy();
                this.setState({
                    health : newHealth,
                    nextLevelAtXP : nextLevelAtXP <= 10 ? 60 : nextLevelAtXP - 10,
                    level : nextLevelAtXP - 10 <= 10 ? level + 1 : level, 
                    playerCoord: [npl, npc],
                    matrixInfo : newMatrInfo,

                });
                return;
            }
            
        }
        



        occupy();
        this.setState({
            playerCoord: [npl, npc],
            matrixInfo : newMatrInfo,
        });
    }
    newDungeon(){
        const {nbCol, nbRow} = this.state;
        const playGround = createPlayground(nbCol,nbRow);
        this.setState(  {
            matrixInfo:playGround.matrixInfo,
            playerCoord:playGround.playerCoord,
        });

    }
    handleKeyEvent(event){
        const moveLineColumn = this.moveLineColumn;
        console.log(event.keyCode);
        switch(event.keyCode){
            case 37://left
                moveLineColumn(0,-1);
                break;
            case 38://Up
                moveLineColumn(-1,0);
                break;
            case 39://Right
                moveLineColumn(0,1);
                break;
            case 40://Down
                moveLineColumn(1,0);
                break;
        }
    }
    render(){
        const {height, width, cellSize, matrixInfo, playerCoord, health, level, weaponIndex, nextLevelAtXP} = this.state;
        const [nbCol, nbRow] = [width,height].map(x=>x/cellSize);
        return(
            <div className='container'>
               <h2>Level:{' '+level} | Weapon: {weapons[weaponIndex].name.toUpperCase()} | Health:{' '+health} | XP to access next Level : {nextLevelAtXP} </h2>
                <svg height={height} width={width}>
                    <Matrix cellSize={cellSize} nbRow={nbRow} nbCol={nbCol} matrixInfo={matrixInfo} playerCoord={playerCoord}/>
                    <rect width={width} height={height} fill='none' stroke='#000000' />
                </svg>
                <br />

            </div>
        );

    }

}

ReactDOM.render(<Labyrinth />, document.querySelector('#root'));
