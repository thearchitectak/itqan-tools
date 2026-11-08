// محتوى أكاديمية الشطرنج: الوحدات والدروس والتمارين والاختبارات (عربي/إنجليزي)
// أنواع الخطوات:
//  info  : شرح مع رقعة اختيارية { fen | pieces, arrows, marks }
//  stars : اجمع النجوم بقطعة واحدة { piece, from, stars, blockers }
//  demo  : عرض نقلات متتالية مع شرح كل نقلة { fen, moves: [[uci, نص]] }
//  task  : تمرين { fen, solution: [نقلة اللاعب، رد الخصم أو '*'، ...] ، acceptMate }
//          نقلة اللاعب قد تكون مصفوفة بدائل مقبولة
//  play  : العب ضد الكمبيوتر حتى تحقق الهدف { fen, goal: 'mate' | 'promote', maxMoves }
//  quiz  : سؤال اختيار من متعدد { q, options, answer, explain, fen? }
const T = (ar, en) => ({ ar, en });
const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

// ---------- الافتتاحيات (تُبنى منها دروس العرض والتدريب) ----------
function opening(id, title, intro, side, moves) {
  // moves: [[uci, ar, en], ...] من الموضع الابتدائي
  const mySide = side === 'w' ? 0 : 1;
  const sol = moves.map(([u], i) => (i % 2 === mySide ? u : u));
  return {
    id: 'op-' + id, title,
    steps: [
      { type: 'info', fen: START, text: intro },
      { type: 'demo', fen: START, moves: moves.map(([u, ar, en]) => [u, T(ar, en)]) },
      {
        type: 'task', fen: START, orientation: side, drill: true,
        text: side === 'w' ? T('الآن دورك: العب نقلات الأبيض في هذه الافتتاحية بالترتيب، والكمبيوتر يرد بنقلات الأسود.', 'Your turn: play White\'s moves of this opening in order; the computer answers with Black\'s moves.')
          : T('الآن دورك: العب نقلات الأسود في هذه الافتتاحية بالترتيب، والكمبيوتر يلعب نقلات الأبيض.', 'Your turn: play Black\'s moves of this opening in order; the computer plays White\'s moves.'),
        solution: sol, firstByOpponent: side === 'b',
      },
    ],
  };
}

export const MODULES = [
  // ======================================================================
  {
    id: 'basics', icon: 'grid-3x3', color: '#0f766e',
    title: T('الرقعة والقطع', 'The board & pieces'), desc: T('تعرّف على الرقعة وحركة كل قطعة', 'Learn the board and how every piece moves'),
    lessons: [
      {
        id: 'b-board', title: T('رقعة الشطرنج', 'The chessboard'), steps: [
          { type: 'info', pieces: {}, text: T('رقعة الشطرنج مكونة من 64 مربعًا: 8 صفوف و8 أعمدة، تتناوب ألوانها بين الفاتح والداكن. توضع الرقعة دائمًا بحيث يكون المربع الفاتح في الزاوية اليمنى القريبة من كل لاعب.', 'The chessboard has 64 squares in 8 rows and 8 columns, alternating light and dark. Always place it so each player has a light square in the right-hand corner.'), marks: { h1: 'good', a8: 'good' } },
          { type: 'info', pieces: {}, text: T('الأعمدة تُسمّى بالحروف من a إلى h، والصفوف تُرقّم من 1 إلى 8. لكل مربع اسم من حرف عموده ورقم صفه، فالمربع المضيء هو e4.', 'Columns (files) are named a to h and rows (ranks) 1 to 8. Each square is named by its file and rank: the highlighted square is e4.'), marks: { e4: 'good' } },
          { type: 'quiz', pieces: {}, marks: { d5: 'good' }, q: T('ما اسم المربع المضيء؟', 'What is the highlighted square called?'), options: [T('e4', 'e4'), T('d5', 'd5'), T('c6', 'c6'), T('d4', 'd4')], answer: 1, explain: T('العمود d والصف 5، فاسمه d5.', 'File d and rank 5, so it is d5.') },
          { type: 'info', fen: START, text: T('هذا هو الموضع الابتدائي. لكل لاعب 16 قطعة: ملك، ووزير، ورخّان، وفيلان، وحصانان، وثمانية بيادق. يبدأ الأبيض دائمًا، والوزير يقف على مربع من لونه: الوزير الأبيض على مربع فاتح.', 'This is the starting position. Each side has 16 pieces: a king, a queen, two rooks, two bishops, two knights and eight pawns. White always moves first, and the queen starts on her own colour.'), marks: { d1: 'good', d8: 'good' } },
          { type: 'quiz', fen: START, q: T('أين يقف الملك الأبيض في بداية المباراة؟', 'Where does the white king start?'), options: [T('d1', 'd1'), T('e1', 'e1'), T('f1', 'f1')], answer: 1, explain: T('الملك الأبيض على e1 بجوار الوزير الذي على d1.', 'The white king starts on e1, next to the queen on d1.') },
        ],
      },
      {
        id: 'b-rook', title: T('الرخ', 'The rook'), steps: [
          { type: 'info', pieces: { d4: 'wR' }, arrows: [['d4', 'd8'], ['d4', 'd1'], ['d4', 'a4'], ['d4', 'h4']], text: T('يتحرك الرخ في خطوط مستقيمة أفقيًا أو رأسيًا، لأي عدد من المربعات، ما دام الطريق خاليًا. قيمته 5 نقاط.', 'The rook moves in straight lines, horizontally or vertically, any number of squares while the path is clear. It is worth 5 points.') },
          { type: 'stars', piece: 'wR', from: 'a1', stars: ['a7', 'f7', 'f2'], text: T('اجمع النجوم بالرخ.', 'Collect the stars with the rook.') },
          { type: 'stars', piece: 'wR', from: 'h1', stars: ['h5', 'c5', 'c8', 'a8'], blockers: { e5: 'bP', h7: 'bP' }, text: T('اجمع النجوم، ولاحظ أن الرخ لا يقفز فوق القطع.', 'Collect the stars — the rook cannot jump over pieces.') },
        ],
      },
      {
        id: 'b-bishop', title: T('الفيل', 'The bishop'), steps: [
          { type: 'info', pieces: { d4: 'wB' }, arrows: [['d4', 'h8'], ['d4', 'a7'], ['d4', 'a1'], ['d4', 'g1']], text: T('يتحرك الفيل قطريًا لأي عدد من المربعات، فيبقى طوال المباراة على مربعات لونه نفسه. قيمته 3 نقاط.', 'The bishop moves diagonally any number of squares, so it stays on squares of one colour all game. It is worth 3 points.') },
          { type: 'stars', piece: 'wB', from: 'c1', stars: ['e3', 'g5', 'd8'], text: T('اجمع النجوم بالفيل.', 'Collect the stars with the bishop.') },
          { type: 'stars', piece: 'wB', from: 'f1', stars: ['a6', 'c8', 'h3', 'e6'], text: T('اجمع النجوم بأقل عدد من النقلات.', 'Collect the stars in as few moves as you can.') },
        ],
      },
      {
        id: 'b-queen', title: T('الوزير', 'The queen'), steps: [
          { type: 'info', pieces: { d4: 'wQ' }, arrows: [['d4', 'd8'], ['d4', 'h8'], ['d4', 'h4'], ['d4', 'g1'], ['d4', 'd1'], ['d4', 'a1'], ['d4', 'a4'], ['d4', 'a7']], text: T('الوزير أقوى القطع: يجمع حركة الرخ والفيل معًا، فيتحرك مستقيمًا أو قطريًا لأي عدد من المربعات. قيمته 9 نقاط.', 'The queen is the strongest piece: she combines the rook and the bishop, moving straight or diagonally any distance. She is worth 9 points.') },
          { type: 'stars', piece: 'wQ', from: 'd1', stars: ['d6', 'g3', 'a3', 'h8'], text: T('اجمع النجوم بالوزير.', 'Collect the stars with the queen.') },
        ],
      },
      {
        id: 'b-king', title: T('الملك', 'The king'), steps: [
          { type: 'info', pieces: { e4: 'wK' }, marks: { d3: 'good', d4: 'good', d5: 'good', e3: 'good', e5: 'good', f3: 'good', f4: 'good', f5: 'good' }, text: T('الملك أهم قطعة: إذا حوصر انتهت المباراة. يتحرك مربعًا واحدًا في أي اتجاه، ولا يجوز أن ينتقل إلى مربع يهاجمه الخصم.', 'The king is the most important piece: if it is trapped the game is over. It moves one square in any direction and may never move into attack.') },
          { type: 'stars', piece: 'wK', from: 'e1', stars: ['e3', 'g4', 'f6'], text: T('اجمع النجوم بالملك.', 'Collect the stars with the king.') },
        ],
      },
      {
        id: 'b-knight', title: T('الحصان', 'The knight'), steps: [
          { type: 'info', pieces: { d4: 'wN' }, marks: { b3: 'good', b5: 'good', c2: 'good', c6: 'good', e2: 'good', e6: 'good', f3: 'good', f5: 'good' }, text: T('يتحرك الحصان على شكل حرف L: مربعين في اتجاه ثم مربعًا جانبيًا. وهو القطعة الوحيدة التي تقفز فوق غيرها. قيمته 3 نقاط.', 'The knight moves in an L shape: two squares one way, then one square sideways. It is the only piece that jumps over others. It is worth 3 points.') },
          { type: 'stars', piece: 'wN', from: 'b1', stars: ['c3', 'd5', 'f6'], text: T('اجمع النجوم بالحصان.', 'Collect the stars with the knight.') },
          { type: 'stars', piece: 'wN', from: 'g1', stars: ['e2', 'c3', 'b5', 'd6'], blockers: { f3: 'bP', d4: 'bP', c5: 'bP' }, text: T('الحصان يقفز فوق القطع. اجمع النجوم.', 'The knight jumps over pieces. Collect the stars.') },
        ],
      },
      {
        id: 'b-pawn', title: T('البيدق', 'The pawn'), steps: [
          { type: 'info', pieces: { e2: 'wP', c4: 'wP' }, arrows: [['e2', 'e4'], ['c4', 'c5']], text: T('يتحرك البيدق إلى الأمام مربعًا واحدًا، ويجوز له في نقلته الأولى أن يتقدم مربعين. لا يتراجع أبدًا. قيمته نقطة واحدة.', 'The pawn moves forward one square, or two on its very first move. It never moves backwards. It is worth 1 point.') },
          { type: 'stars', piece: 'wP', from: 'd2', stars: ['d4', 'd5', 'd6'], text: T('حرّك البيدق إلى النجوم.', 'Move the pawn to the stars.') },
          { type: 'info', fen: '4k3/8/8/3n1b2/4P3/8/8/4K3 w - - 0 1', arrows: [['e4', 'd5', '#dc2626'], ['e4', 'f5', '#dc2626']], text: T('يأخذ البيدق قطريًا إلى الأمام فقط، ولا يأخذ ما أمامه مباشرة.', 'A pawn captures diagonally forward only — never straight ahead.') },
          { type: 'task', fen: '4k3/8/8/3n1b2/4P3/8/8/4K3 w - - 0 1', solution: [['e4d5', 'e4f5']], text: T('خذ إحدى القطعتين بالبيدق.', 'Capture one of the pieces with the pawn.') },
        ],
      },
    ],
  },
  // ======================================================================
  {
    id: 'rules', icon: 'flag', color: '#2563eb',
    title: T('القواعد المهمة', 'Key rules'), desc: T('الكش والكش مات والتبييت والترقية والتعادل', 'Check, mate, castling, promotion and draws'),
    lessons: [
      {
        id: 'r-check', title: T('الكش والخروج منه', 'Check and escaping it'), steps: [
          { type: 'info', fen: '4r2k/8/8/8/8/8/8/4K3 w - - 0 1', arrows: [['e8', 'e1', '#dc2626']], text: T('«الكش» يعني أن الملك مهاجم. يجب الخروج من الكش فورًا بإحدى ثلاث طرق: نقل الملك، أو وضع قطعة بينه وبين المهاجم، أو أخذ القطعة المهاجمة.', 'Check means the king is attacked. You must get out of check immediately in one of three ways: move the king, block the attack, or capture the attacker.') },
          { type: 'task', fen: '4r2k/8/8/8/8/8/8/4K3 w - - 0 1', solution: [['e1d1', 'e1d2', 'e1f1', 'e1f2']], text: T('الطريقة الأولى: انقل الملك إلى مربع آمن.', 'Way 1: move the king to a safe square.') },
          { type: 'task', fen: '6k1/8/8/8/8/8/4BPPP/r5K1 w - - 0 1', solution: [['e2f1', 'e2d1']], text: T('الطريقة الثانية: الملك لا يستطيع الهرب، فضع قطعة بينه وبين الرخ.', 'Way 2: the king cannot escape, so block the rook\'s attack.') },
          { type: 'task', fen: '7k/8/8/8/8/8/3q4/4K3 w - - 0 1', solution: ['e1d2'], text: T('الطريقة الثالثة: خذ القطعة التي تعطي الكش.', 'Way 3: capture the checking piece.') },
        ],
      },
      {
        id: 'r-mate', title: T('الكش مات', 'Checkmate'), steps: [
          { type: 'info', fen: '3R2k1/5ppp/8/8/8/8/8/6K1 b - - 0 1', arrows: [['d8', 'g8', '#dc2626']], text: T('«الكش مات» هو كش لا يمكن الخروج منه بأي طريقة، وبه تنتهي المباراة بفوز من أعطاه. هنا الملك الأسود محاصر ببيادقه ولا يستطيع الهرب.', 'Checkmate is a check that cannot be escaped in any way; it ends the game. Here the black king is trapped by its own pawns.') },
          { type: 'task', fen: '6k1/5ppp/8/8/8/8/8/3R2K1 w - - 0 1', solution: ['d1d8'], acceptMate: true, text: T('أعطِ كش مات في نقلة واحدة.', 'Give checkmate in one move.') },
          { type: 'task', fen: '7k/8/6K1/8/8/8/8/4Q3 w - - 0 1', solution: ['e1e8'], acceptMate: true, text: T('أعطِ كش مات بالوزير.', 'Checkmate with the queen.') },
        ],
      },
      {
        id: 'r-castle', title: T('التبييت', 'Castling'), steps: [
          { type: 'info', fen: 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1', arrows: [['e1', 'g1'], ['h1', 'f1', '#2563eb']], text: T('التبييت نقلة خاصة يتحرك فيها الملك مربعين نحو الرخ، ويقفز الرخ إلى الجهة الأخرى من الملك. يؤمّن الملك ويُدخل الرخ إلى اللعب.', 'Castling is a special move: the king moves two squares towards a rook, and the rook jumps to the king\'s other side. It makes the king safe and activates the rook.') },
          { type: 'info', fen: 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1', text: T('شروط التبييت: ألا يكون الملك ولا الرخ قد تحركا من قبل، وأن يكون ما بينهما خاليًا، وألا يكون الملك في كش، ولا يمر بمربع مهاجم أو ينتهي إليه.', 'Conditions: neither the king nor that rook has moved, the squares between them are empty, the king is not in check, and it does not pass through or land on an attacked square.') },
          { type: 'task', fen: 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1', solution: ['e1g1'], text: T('نفّذ التبييت القصير: اسحب الملك مربعين نحو الرخ الذي على h1.', 'Castle kingside: move the king two squares towards the h1 rook.') },
          { type: 'task', fen: 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1', solution: ['e1c1'], text: T('نفّذ التبييت الطويل نحو الرخ الذي على a1.', 'Castle queenside, towards the a1 rook.') },
        ],
      },
      {
        id: 'r-ep', title: T('الأخذ بالتجاوز', 'En passant'), steps: [
          { type: 'info', fen: '4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1', arrows: [['d7', 'd5', '#9ca3af'], ['e5', 'd6']], text: T('إذا تقدم بيدق الخصم مربعين فوقف بجوار بيدقك، جاز لك أن تأخذه كأنه تقدم مربعًا واحدًا، بشرط أن تفعل ذلك في النقلة التالية مباشرة.', 'If an enemy pawn advances two squares and lands beside your pawn, you may capture it as if it had moved only one — but only on the very next move.') },
          { type: 'task', fen: '4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1', solution: ['e5d6'], text: T('تقدم البيدق الأسود للتو من d7 إلى d5. خذه بالتجاوز.', 'Black\'s pawn has just moved d7–d5. Capture it en passant.') },
        ],
      },
      {
        id: 'r-promo', title: T('ترقية البيدق', 'Promotion'), steps: [
          { type: 'info', fen: '4k3/1P6/8/8/8/8/8/4K3 w - - 0 1', arrows: [['b7', 'b8']], text: T('إذا وصل البيدق إلى الصف الأخير يُرقّى فورًا إلى وزير أو رخ أو فيل أو حصان، ويختار اللاعب غالبًا الوزير لأنه الأقوى.', 'When a pawn reaches the last rank it must be promoted to a queen, rook, bishop or knight — usually a queen, the strongest.') },
          { type: 'task', fen: '4k3/1P6/8/8/8/8/8/4K3 w - - 0 1', solution: ['b7b8q'], text: T('رقِّ البيدق إلى وزير.', 'Promote the pawn to a queen.') },
        ],
      },
      {
        id: 'r-draw', title: T('التعادل', 'Draws'), steps: [
          { type: 'info', fen: '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1', marks: { h8: 'bad' }, text: T('«الملك المخنوق»: إذا لم يكن الملك في كش ولم تكن لصاحب الدور أي نقلة قانونية، انتهت المباراة بالتعادل. هنا دور الأسود، وملكه ليس في كش لكنه لا يستطيع التحرك.', 'Stalemate: if the side to move is not in check but has no legal move, the game is a draw. Here it is Black\'s move; the king is not in check but cannot move.') },
          { type: 'info', fen: '8/8/4k3/8/8/3K4/8/8 w - - 0 1', text: T('ومن حالات التعادل أيضًا: عدم كفاية القطع للكش مات (مثل ملك مقابل ملك)، وتكرار الموضع نفسه ثلاث مرات، ومرور 50 نقلة دون أخذ أي قطعة أو تحريك أي بيدق، واتفاق اللاعبين.', 'Other draws: insufficient material to mate (such as king against king), the same position three times, 50 moves without a capture or pawn move, and agreement.') },
          { type: 'quiz', fen: '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1', q: T('دور الأسود في هذا الموضع. ما النتيجة؟', 'It is Black to move. What is the result?'), options: [T('فوز الأبيض بكش مات', 'White wins by checkmate'), T('تعادل لأن الملك مخنوق', 'Draw by stalemate'), T('يستمر اللعب', 'Play continues')], answer: 1, explain: T('الملك الأسود ليس في كش، ولا توجد للأسود أي نقلة قانونية، فهي حالة الملك المخنوق.', 'The black king is not in check and Black has no legal move: stalemate.') },
        ],
      },
    ],
  },
  // ======================================================================
  {
    id: 'values', icon: 'calculator', color: '#9333ea',
    title: T('قيمة القطع', 'Piece values'), desc: T('كيف تقارن بين القطع وتختار التبادل المفيد', 'Compare pieces and choose good trades'),
    lessons: [
      {
        id: 'v-values', title: T('قيمة كل قطعة', 'What each piece is worth'), steps: [
          { type: 'info', fen: START, text: T('القيم التقريبية: البيدق = 1، الحصان = 3، الفيل = 3، الرخ = 5، الوزير = 9، أما الملك فلا يُقدّر بثمن. تساعدك هذه الأرقام على معرفة هل التبادل في صالحك.', 'Approximate values: pawn 1, knight 3, bishop 3, rook 5, queen 9; the king is priceless. These numbers tell you whether a trade is good for you.') },
          { type: 'quiz', q: T('هل يفيدك أن تعطي رخًا مقابل حصان؟', 'Is it good to give a rook for a knight?'), options: [T('نعم، يفيدني', 'Yes'), T('لا، أخسر نقطتين تقريبًا', 'No — I lose about two points')], answer: 1, explain: T('الرخ 5 والحصان 3، فتخسر نحو نقطتين.', 'A rook is 5 and a knight 3, so you lose about two points.') },
          { type: 'quiz', q: T('أيهما أكبر قيمة: رخّان أم وزير؟', 'Which is worth more: two rooks or a queen?'), options: [T('الرخّان (10 نقاط)', 'Two rooks (10)'), T('الوزير (9 نقاط)', 'The queen (9)'), T('متساويان تمامًا', 'Exactly equal')], answer: 0, explain: T('الرخّان 10 نقاط تقريبًا، أي أكثر قليلًا من الوزير.', 'Two rooks are about 10 points, slightly more than a queen.') },
        ],
      },
      {
        id: 'v-hanging', title: T('القطع غير المحمية', 'Undefended pieces'), steps: [
          { type: 'info', fen: '4k3/8/8/3q4/8/8/3R4/4K3 w - - 0 1', arrows: [['d2', 'd5']], text: T('القطعة «غير المحمية» هي التي لا تحميها أي قطعة من قطع صاحبها. ابحث دائمًا عن قطع الخصم غير المحمية، وانتبه لقطعك أنت.', 'An undefended piece has no friendly piece protecting it. Always look for your opponent\'s undefended pieces — and watch your own.') },
          { type: 'task', fen: '4k3/8/8/3q4/8/8/3R4/4K3 w - - 0 1', solution: ['d2d5'], text: T('الوزير الأسود غير محمي. خذه.', 'The black queen is undefended. Take it.') },
          { type: 'task', fen: 'r3k3/8/2n5/8/B7/8/8/4K3 w - - 0 1', solution: ['a4c6'], text: T('إحدى قطع الأسود غير محمية ويمكنك أخذها بأمان. جدها.', 'One black piece is undefended and can be taken safely. Find it.') },
        ],
      },
    ],
  },
  // ======================================================================
  {
    id: 'principles', icon: 'lightbulb', color: '#f59e0b',
    title: T('مبادئ الافتتاح', 'Opening principles'), desc: T('القواعد الذهبية لبداية قوية', 'Golden rules for a strong start'),
    lessons: [
      {
        id: 'p-center', title: T('السيطرة على المركز', 'Control the centre'), steps: [
          { type: 'info', fen: START, marks: { d4: 'good', e4: 'good', d5: 'good', e5: 'good' }, text: T('المربعات الأربعة d4 وe4 وd5 وe5 هي مركز الرقعة. القطع في المركز تتحرك بحرية أكبر وتهاجم مربعات أكثر، لذلك يبدأ أغلب اللاعبين بتحريك بيادق المركز.', 'd4, e4, d5 and e5 are the centre. Pieces in the centre are more mobile and attack more squares, so most players start by moving a centre pawn.') },
          { type: 'demo', fen: START, moves: [['e2e4', T('يحتل الأبيض المركز ويفتح الطريق للفيل والوزير.', 'White occupies the centre and frees the bishop and queen.')], ['e7e5', T('يرد الأسود بالطريقة نفسها.', 'Black answers in kind.')], ['g1f3', T('حصان يهاجم بيدق e5 ويطوّر قطعة.', 'A knight attacks e5 while developing.')], ['b8c6', T('الأسود يحمي بيدقه ويطوّر حصانه.', 'Black defends and develops.')]] },
          { type: 'quiz', fen: START, q: T('أي النقلات التالية أفضل للسيطرة على المركز؟', 'Which move best fights for the centre?'), options: [T('a2-a4', 'a2–a4'), T('e2-e4', 'e2–e4'), T('h2-h4', 'h2–h4')], answer: 1, explain: T('e4 يحتل مربعًا مركزيًا ويهاجم d5 وf5.', 'e4 occupies a central square and attacks d5 and f5.') },
        ],
      },
      {
        id: 'p-develop', title: T('طوّر قطعك وبيّت ملكك', 'Develop and castle'), steps: [
          { type: 'info', fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4', text: T('«التطوير» هو إخراج الأحصنة والأفيال من أماكنها الأولى إلى مربعات فعالة. قاعدة عامة: الأحصنة قبل الأفيال، ولا تحرك القطعة نفسها مرتين في الافتتاح دون سبب.', 'Developing means bringing knights and bishops off the back rank to active squares. Rule of thumb: knights before bishops, and don\'t move the same piece twice in the opening without reason.') },
          { type: 'task', fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4', solution: ['e1g1'], text: T('طوّرت حصانًا وفيلًا. الآن أمّن ملكك بالتبييت.', 'You have developed a knight and a bishop. Now make your king safe by castling.') },
          { type: 'quiz', q: T('متى يُفضّل تبييت الملك عادةً؟', 'When should you usually castle?'), options: [T('في الافتتاح، بعد تطوير قطع جهة الملك', 'In the opening, after developing the kingside pieces'), T('في نهاية المباراة فقط', 'Only in the endgame'), T('لا داعي للتبييت', 'Never')], answer: 0, explain: T('التبييت المبكر يحمي الملك من الهجمات ويصل الرخين.', 'Early castling protects the king and connects the rooks.') },
        ],
      },
      {
        id: 'p-queen', title: T('لا تُخرج الوزير مبكرًا', 'Don\'t bring the queen out early'), steps: [
          { type: 'demo', fen: START, moves: [
            ['e2e4', T('بداية جيدة.', 'A good start.')], ['e7e5', T('رد متماثل.', 'Symmetrical reply.')],
            ['d1h5', T('يُخرج الأبيض وزيره مبكرًا ويهدد البيدق e5.', 'White brings the queen out early, hitting e5.')],
            ['b8c6', T('يحمي الأسود البيدق ويطوّر حصانًا.', 'Black defends while developing.')],
            ['f1c4', T('يهدد الأبيض بالكش مات على f7!', 'White threatens mate on f7!')],
            ['g7g6', T('يصدّ الأسود التهديد ويطرد الوزير.', 'Black stops the threat and chases the queen.')],
            ['h5f3', T('يعود الوزير ليهدد f7 مرة أخرى.', 'The queen returns to threaten f7 again.')],
            ['g8f6', T('يطوّر الأسود حصانه ويصد التهديد. الوزير الأبيض تحرك ثلاث مرات، والأسود يطوّر قطعه بسرعة.', 'Black develops and defends. White\'s queen has moved three times while Black keeps developing.')],
          ] },
          { type: 'quiz', q: T('لماذا لا يُنصح بإخراج الوزير مبكرًا؟', 'Why is an early queen sortie usually bad?'), options: [T('لأن الخصم يطارده ويكسب الوقت لتطوير قطعه', 'The opponent chases it and gains time to develop'), T('لأن الوزير ضعيف', 'The queen is weak'), T('لأن القواعد تمنع ذلك', 'The rules forbid it')], answer: 0, explain: T('كل نقلة يهرب فيها الوزير هي نقلة يكسبها الخصم لتطوير قطعة جديدة.', 'Every move the queen spends escaping is a move the opponent gains for development.') },
        ],
      },
    ],
  },
  // ======================================================================
  {
    id: 'openings', icon: 'layers', color: '#a16207',
    title: T('أشهر الافتتاحيات', 'Famous openings'), desc: T('تعلّم أشهر الافتتاحيات وتدرّب على نقلاتها', 'Learn and drill the most popular openings'),
    lessons: [
      opening('italian', T('الافتتاحية الإيطالية', 'Italian Game'), T('من أقدم الافتتاحيات وأشهرها. يوجّه الأبيض فيله نحو f7، أضعف نقطة في معسكر الأسود.', 'One of the oldest openings. White aims the bishop at f7, Black\'s weakest point.'), 'w', [
        ['e2e4', 'يسيطر على المركز.', 'Takes the centre.'], ['e7e5', 'رد مركزي.', 'Central reply.'],
        ['g1f3', 'يهاجم e5 ويطوّر.', 'Attacks e5, develops.'], ['b8c6', 'يحمي e5.', 'Defends e5.'],
        ['f1c4', 'الفيل الإيطالي يستهدف f7.', 'The Italian bishop eyes f7.'], ['f8c5', 'الأسود يرد بالمثل ويستهدف f2.', 'Black mirrors, eyeing f2.'],
        ['c2c3', 'يجهّز d4 لبناء مركز قوي.', 'Prepares d4 for a big centre.'], ['g8f6', 'يطوّر ويهاجم e4.', 'Develops and hits e4.'],
        ['d2d4', 'يضرب في المركز.', 'Strikes in the centre.'],
      ]),
      opening('ruy', T('روي لوبيز (الإسبانية)', 'Ruy Lopez'), T('افتتاحية الأبطال: يضغط الأبيض على الحصان الذي يحمي بيدق e5.', 'The champions\' opening: White pressures the knight that guards e5.'), 'w', [
        ['e2e4', 'يسيطر على المركز.', 'Takes the centre.'], ['e7e5', 'رد مركزي.', 'Central reply.'],
        ['g1f3', 'يهاجم e5.', 'Attacks e5.'], ['b8c6', 'يحمي e5.', 'Defends e5.'],
        ['f1b5', 'الفيل الإسباني يضغط على حامي e5.', 'The Spanish bishop pins pressure on e5\'s defender.'], ['a7a6', 'يسأل الفيل عن نيته.', 'Puts the question to the bishop.'],
        ['b5a4', 'يحافظ على الضغط.', 'Keeps the tension.'], ['g8f6', 'يطوّر ويهاجم e4.', 'Develops, hits e4.'],
        ['e1g1', 'يبيّت الملك.', 'Castles.'], ['f8e7', 'يطوّر ويجهّز التبييت.', 'Develops, prepares castling.'],
      ]),
      opening('scotch', T('الافتتاحية الاسكتلندية', 'Scotch Game'), T('يفتح الأبيض المركز مبكرًا بالنقلة d4.', 'White opens the centre early with d4.'), 'w', [
        ['e2e4', 'يسيطر على المركز.', 'Takes the centre.'], ['e7e5', 'رد مركزي.', 'Central reply.'],
        ['g1f3', 'يهاجم e5.', 'Attacks e5.'], ['b8c6', 'يحمي e5.', 'Defends e5.'],
        ['d2d4', 'يفتح المركز فورًا.', 'Opens the centre at once.'], ['e5d4', 'يأخذ الأسود.', 'Black captures.'],
        ['f3d4', 'يسترد البيدق بحصان مركزي.', 'Recaptures with a central knight.'],
      ]),
      opening('london', T('نظام لندن', 'London System'), T('نظام مرن وسهل للأبيض: البيادق على d4 وe3 وc3، والفيل على f4.', 'A solid, easy system for White: pawns on d4, e3, c3 and the bishop on f4.'), 'w', [
        ['d2d4', 'يسيطر على المركز ببيدق الوزير.', 'Takes the centre with the d-pawn.'], ['d7d5', 'رد مركزي.', 'Central reply.'],
        ['c1f4', 'الفيل يخرج قبل e3، وهذه سمة نظام لندن.', 'The bishop comes out before e3 — the London hallmark.'], ['g8f6', 'يطوّر الحصان.', 'Develops the knight.'],
        ['e2e3', 'يفتح الطريق للفيل الآخر.', 'Opens the other bishop.'], ['e7e6', 'بناء متين.', 'Solid setup.'],
        ['g1f3', 'يطوّر الحصان.', 'Develops the knight.'], ['c7c5', 'يضغط على d4.', 'Pressures d4.'],
        ['c2c3', 'يدعم d4 ويحافظ على المركز.', 'Supports d4.'],
      ]),
      opening('qgd', T('غامبيت الوزير', 'Queen\'s Gambit'), T('يعرض الأبيض بيدق c4 ليبعد بيدق الأسود عن المركز. «غامبيت» يعني التضحية ببيدق في الافتتاح.', 'White offers the c-pawn to deflect Black\'s centre pawn. A gambit is an opening sacrifice.'), 'w', [
        ['d2d4', 'بيدق الوزير إلى المركز.', 'The queen\'s pawn to the centre.'], ['d7d5', 'رد مركزي.', 'Central reply.'],
        ['c2c4', 'الغامبيت: يعرض بيدق c4.', 'The gambit: offers c4.'], ['e7e6', 'يرفض الأسود ويحمي d5.', 'Black declines, supporting d5.'],
        ['b1c3', 'يزيد الضغط على d5.', 'More pressure on d5.'], ['g8f6', 'يحمي d5 مرة أخرى.', 'Defends d5 again.'],
        ['c1g5', 'يثبّت الحصان الذي يحمي d5.', 'Pins the knight that defends d5.'], ['f8e7', 'يفك التثبيت.', 'Breaks the pin.'],
      ]),
      opening('english', T('الافتتاحية الإنجليزية', 'English Opening'), T('يبدأ الأبيض بالنقلة c4 ويسيطر على المركز من الجناح.', 'White starts with c4 and controls the centre from the flank.'), 'w', [
        ['c2c4', 'يسيطر على d5 من الجناح.', 'Controls d5 from the side.'], ['e7e5', 'رد مركزي.', 'Central reply.'],
        ['b1c3', 'يطوّر ويسيطر على d5.', 'Develops, eyes d5.'], ['g8f6', 'يطوّر.', 'Develops.'],
        ['g1f3', 'يهاجم e5.', 'Attacks e5.'], ['b8c6', 'يحمي e5.', 'Defends e5.'],
        ['g2g3', 'يجهّز الفيل على القطر الطويل.', 'Prepares the long-diagonal bishop.'],
      ]),
      opening('sicilian', T('الدفاع الصقلي', 'Sicilian Defence'), T('أشهر رد على e4: يقاتل الأسود على المركز بالبيدق c5 ويخلق موقفًا غير متماثل.', 'The most popular answer to e4: Black fights for d4 with c5 and creates an unbalanced game.'), 'b', [
        ['e2e4', 'الأبيض يبدأ بـ e4.', 'White opens e4.'], ['c7c5', 'الصقلي: يسيطر على d4 من الجانب.', 'The Sicilian: controls d4 from the side.'],
        ['g1f3', 'يطوّر ويجهّز d4.', 'Develops, prepares d4.'], ['d7d6', 'يمنع e5 ويفتح الطريق للفيل.', 'Stops e5, frees the bishop.'],
        ['d2d4', 'يفتح المركز.', 'Opens the centre.'], ['c5d4', 'يبادل جناحًا بمركز.', 'Trades a wing pawn for a centre pawn.'],
        ['f3d4', 'يسترد البيدق.', 'Recaptures.'], ['g8f6', 'يهاجم e4.', 'Hits e4.'],
        ['b1c3', 'يحمي e4.', 'Defends e4.'], ['a7a6', 'نايدورف: نقلة مرنة تمنع Nb5 وBb5.', 'The Najdorf: a flexible move stopping Nb5 and Bb5.'],
      ]),
      opening('french', T('الدفاع الفرنسي', 'French Defence'), T('دفاع متين: يجهّز الأسود d5 ليتحدى مركز الأبيض.', 'A solid defence: Black prepares d5 to challenge White\'s centre.'), 'b', [
        ['e2e4', 'الأبيض يبدأ بـ e4.', 'White opens e4.'], ['e7e6', 'الفرنسي: يجهّز d5.', 'The French: prepares d5.'],
        ['d2d4', 'مركز كامل.', 'A full centre.'], ['d7d5', 'يتحدى e4.', 'Challenges e4.'],
        ['b1c3', 'يحمي e4.', 'Defends e4.'], ['g8f6', 'يزيد الضغط على e4.', 'Adds pressure on e4.'],
      ]),
      opening('caro', T('دفاع كارو-كان', 'Caro-Kann Defence'), T('دفاع صلب: يجهّز الأسود d5 بالبيدق c6 مع إبقاء طريق الفيل مفتوحًا.', 'A rock-solid defence: c6 prepares d5 while keeping the light bishop free.'), 'b', [
        ['e2e4', 'الأبيض يبدأ بـ e4.', 'White opens e4.'], ['c7c6', 'كارو-كان: يجهّز d5.', 'Caro-Kann: prepares d5.'],
        ['d2d4', 'مركز كامل.', 'A full centre.'], ['d7d5', 'يتحدى e4.', 'Challenges e4.'],
        ['b1c3', 'يحمي e4.', 'Defends e4.'], ['d5e4', 'يأخذ الأسود.', 'Black captures.'],
        ['c3e4', 'يسترد الأبيض.', 'White recaptures.'], ['c8f5', 'الفيل يخرج نشيطًا ويهاجم الحصان.', 'The bishop comes out actively, hitting the knight.'],
      ]),
      opening('scandi', T('الدفاع الإسكندنافي', 'Scandinavian Defence'), T('يهاجم الأسود بيدق e4 فورًا بالنقلة d5.', 'Black hits e4 immediately with d5.'), 'b', [
        ['e2e4', 'الأبيض يبدأ بـ e4.', 'White opens e4.'], ['d7d5', 'الإسكندنافي: هجوم فوري على e4.', 'Scandinavian: immediate attack on e4.'],
        ['e4d5', 'يأخذ الأبيض.', 'White captures.'], ['d8d5', 'يسترد الوزير.', 'The queen recaptures.'],
        ['b1c3', 'يطوّر ويهاجم الوزير.', 'Develops with tempo on the queen.'], ['d5a5', 'الوزير يتراجع إلى مربع آمن ونشيط.', 'The queen retreats to a safe, active square.'],
      ]),
      opening('kid', T('الدفاع الهندي الملكي', 'King\'s Indian Defence'), T('يسمح الأسود للأبيض ببناء مركز كبير، ثم يهاجمه لاحقًا. الفيل على g7 قطعة أساسية.', 'Black lets White build a big centre, then attacks it later. The g7 bishop is key.'), 'b', [
        ['d2d4', 'الأبيض يبدأ بـ d4.', 'White opens d4.'], ['g8f6', 'يطوّر ويمنع e4.', 'Develops, stops e4.'],
        ['c2c4', 'يزيد السيطرة.', 'More space.'], ['g7g6', 'يجهّز الفيل على g7.', 'Prepares the g7 bishop.'],
        ['b1c3', 'يجهّز e4.', 'Prepares e4.'], ['f8g7', 'الفيل على القطر الطويل.', 'The bishop on the long diagonal.'],
        ['e2e4', 'مركز كبير.', 'A big centre.'], ['d7d6', 'يمنع e5.', 'Stops e5.'],
        ['g1f3', 'يطوّر.', 'Develops.'], ['e8g8', 'يبيّت الملك.', 'Castles.'],
      ]),
    ],
  },
  // ======================================================================
  {
    id: 'tactics', icon: 'swords', color: '#dc2626',
    title: T('التكتيكات', 'Tactics'), desc: T('الشوكة والتثبيت والسيخ والهجوم المكشوف', 'Forks, pins, skewers and discovered attacks'),
    lessons: [
      {
        id: 't-fork', title: T('الشوكة', 'The fork'), steps: [
          { type: 'info', fen: 'r3k3/2N5/8/8/8/8/8/4K3 b - - 0 1', arrows: [['c7', 'e8', '#dc2626'], ['c7', 'a8', '#dc2626']], text: T('«الشوكة» هجوم قطعة واحدة على قطعتين أو أكثر في الوقت نفسه، فلا يستطيع الخصم إنقاذهما معًا. الحصان أشهر من يصنع الشوكة.', 'A fork is one piece attacking two or more at once, so the opponent cannot save both. The knight is the classic forker.') },
          { type: 'task', fen: 'r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1', solution: ['b5c7', '*', 'c7a8'], text: T('اصنع شوكة بالحصان على الملك والرخ، ثم خذ الرخ.', 'Fork the king and rook with your knight, then take the rook.') },
          { type: 'task', fen: '4k3/8/8/2n1r3/8/3P4/8/6K1 w - - 0 1', solution: ['d3d4'], text: T('البيدق يصنع شوكة أيضًا! هاجم القطعتين معًا.', 'Pawns fork too! Attack both pieces at once.') },
        ],
      },
      {
        id: 't-pin', title: T('التثبيت', 'The pin'), steps: [
          { type: 'info', fen: '4k3/8/2n5/1B6/8/8/8/4K3 b - - 0 1', arrows: [['b5', 'e8', '#dc2626']], text: T('«التثبيت»: قطعة لا تستطيع التحرك لأن خلفها قطعة أهم ستُكشف للهجوم. هنا الحصان مثبّت أمام ملكه، فلا يجوز له التحرك أصلًا.', 'A pin: a piece cannot move because a more valuable piece behind it would be exposed. Here the knight is pinned to its king and may not move at all.') },
          { type: 'task', fen: '4k3/pp3ppp/2n5/1B6/3P4/8/PP3PPP/4K3 w - - 0 1', solution: ['d4d5'], text: T('الحصان مثبّت. هاجمه ببيدق ليكسب القطعة.', 'The knight is pinned. Attack it with a pawn to win it.') },
          { type: 'task', fen: '4k3/8/8/4q3/8/8/3K4/R7 w - - 0 1', solution: ['a1e1'], text: T('ثبّت الوزير الأسود أمام ملكه.', 'Pin the black queen to its king.') },
        ],
      },
      {
        id: 't-skewer', title: T('السيخ', 'The skewer'), steps: [
          { type: 'info', fen: '8/8/R1k4q/8/8/8/8/6K1 b - - 0 1', arrows: [['a6', 'h6', '#dc2626']], text: T('«السيخ» عكس التثبيت: تهاجم قطعة ثمينة فتضطر إلى الابتعاد، فتكشف قطعة خلفها فتأخذها.', 'A skewer is a reverse pin: you attack a valuable piece, it must move away, and the piece behind it falls.') },
          { type: 'task', fen: '8/8/2k4q/8/8/8/8/R5K1 w - - 0 1', solution: ['a1a6', '*', 'a6h6'], text: T('أعطِ كشًّا بالرخ على الصف السادس، ثم خذ الوزير.', 'Check along the sixth rank with the rook, then take the queen.') },
        ],
      },
      {
        id: 't-discovered', title: T('الهجوم المكشوف والكش المزدوج', 'Discovered attack & double check'), steps: [
          { type: 'info', fen: '4k3/3q4/8/8/4N3/8/8/4R1K1 w - - 0 1', arrows: [['e1', 'e8', '#dc2626']], text: T('«الهجوم المكشوف»: تحرك قطعة فتكشف هجوم قطعة أخرى خلفها. وإذا هاجمت القطعتان الملك معًا سُمّي «كشًّا مزدوجًا»، ولا يُرد عليه إلا بتحريك الملك.', 'A discovered attack: moving one piece unveils an attack by another behind it. If both attack the king it is a double check, which can only be met by moving the king.') },
          { type: 'task', fen: '4k3/3q4/8/8/4N3/8/8/4R1K1 w - - 0 1', solution: ['e4f6', '*', 'f6d7'], text: T('حرّك الحصان ليعطي كشًّا مزدوجًا ويهاجم الوزير، ثم خذ الوزير.', 'Move the knight to give double check while attacking the queen, then take the queen.') },
        ],
      },
    ],
  },
  // ======================================================================
  {
    id: 'mates', icon: 'crown', color: '#be185d',
    title: T('أنماط الكش مات', 'Checkmate patterns'), desc: T('أشهر صور الكش مات التي يجب أن تعرفها', 'The mating patterns every player should know'),
    lessons: [
      { id: 'm-backrank', title: T('مات الصف الأخير', 'Back-rank mate'), steps: [
        { type: 'info', fen: '3R2k1/5ppp/8/8/8/8/5PPP/6K1 b - - 0 1', text: T('عندما تبقى بيادق التبييت في مكانها دون فتحة للملك، قد يُحاصر الملك في صفه الأخير برخ أو وزير.', 'When the castled pawns never moved, the king can be trapped on its back rank by a rook or queen.') },
        { type: 'task', fen: '3r2k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1', solution: ['d1d8'], acceptMate: true, text: T('أعطِ كش مات في نقلة.', 'Mate in one.') },
      ] },
      { id: 'm-ladder', title: T('مات السلّم بالرخين', 'The ladder mate'), steps: [
        { type: 'info', fen: 'k5R1/7R/8/8/8/8/8/7K b - - 0 1', text: T('رخّان يعملان معًا: أحدهما يقطع صفًّا، والآخر يعطي الكش على الصف التالي، فيدفعان الملك إلى الحافة.', 'Two rooks work together: one cuts off a rank, the other checks on the next, pushing the king to the edge.') },
        { type: 'task', fen: 'k7/7R/8/8/8/8/8/6RK w - - 0 1', solution: ['g1g8'], acceptMate: true, text: T('أنهِ مات السلّم.', 'Finish the ladder mate.') },
      ] },
      { id: 'm-kiss', title: T('قبلة الوزير', 'The queen\'s kiss'), steps: [
        { type: 'info', fen: 'k7/1Q6/1K6/8/8/8/8/8 b - - 0 1', text: T('يقف الوزير ملاصقًا للملك المهاجَم، ويحميه ملكه، فلا يستطيع الخصم أخذه.', 'The queen stands right next to the enemy king, protected by her own king, so she cannot be taken.') },
        { type: 'task', fen: 'k7/7Q/1K6/8/8/8/8/8 w - - 0 1', solution: ['h7b7'], acceptMate: true, text: T('أعطِ كش مات في نقلة.', 'Mate in one.') },
      ] },
      { id: 'm-smothered', title: T('المات الخانق', 'Smothered mate'), steps: [
        { type: 'info', fen: '6rk/5Npp/8/8/8/8/8/6K1 b - - 0 1', text: T('ملك محاط بقطعه من كل جانب، فيعطيه الحصان كشًّا لا مهرب منه.', 'A king surrounded by its own pieces is mated by a knight.') },
        { type: 'task', fen: '6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1', solution: ['g5f7'], acceptMate: true, text: T('أعطِ المات الخانق.', 'Deliver smothered mate.') },
      ] },
      { id: 'm-arabian', title: T('المات العربي', 'The Arabian mate'), steps: [
        { type: 'info', fen: '7k/7R/5N2/8/8/8/8/6K1 b - - 0 1', text: T('من أقدم أنماط الكش مات، ذُكر في مخطوطات الشطرنج العربية القديمة: الرخ يعطي الكش، والحصان يحميه ويغلق مهرب الملك.', 'One of the oldest mating patterns, found in early Arabic chess manuscripts: the rook checks and the knight protects it and covers the escape.') },
        { type: 'task', fen: '7k/R7/5N2/8/8/8/8/6K1 w - - 0 1', solution: ['a7h7'], acceptMate: true, text: T('أعطِ المات العربي.', 'Deliver the Arabian mate.') },
      ] },
      { id: 'm-anastasia', title: T('مات أناستازيا', 'Anastasia\'s mate'), steps: [
        { type: 'info', fen: '8/4Nppk/8/8/8/8/8/K6R b - - 0 1', text: T('الحصان يغلق مربعات الهروب، والرخ يعطي الكش على عمود الملك المحاصر بين حافة الرقعة وبيدقه.', 'The knight covers the escape squares and the rook mates along the file of a king trapped by the edge and its own pawn.') },
        { type: 'task', fen: '8/4Nppk/8/8/8/8/8/K3R3 w - - 0 1', solution: ['e1h1'], acceptMate: true, text: T('أعطِ كش مات في نقلة.', 'Mate in one.') },
      ] },
      { id: 'm-scholar', title: T('مات الراعي ومات الأحمق', 'Scholar\'s mate & Fool\'s mate'), steps: [
        { type: 'demo', fen: START, moves: [['e2e4', T('بداية عادية.', 'A normal start.')], ['e7e5', T('رد عادي.', 'A normal reply.')], ['f1c4', T('الفيل يستهدف f7.', 'The bishop targets f7.')], ['b8c6', T('تطوير.', 'Development.')], ['d1h5', T('الوزير يهاجم f7 أيضًا!', 'The queen also targets f7!')], ['g8f6', T('خطأ! يهاجم الوزير لكنه لا يحمي f7.', 'A mistake! It attacks the queen but leaves f7 undefended.')], ['h5f7', T('كش مات! وهذا «مات الراعي». الدفاع الصحيح كان g6 أو Qe7.', 'Checkmate — Scholar\'s mate. The right defence was ...g6 or ...Qe7.')]] },
        { type: 'task', fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4', solution: ['h5f7'], acceptMate: true, text: T('أعطِ مات الراعي.', 'Deliver Scholar\'s mate.') },
        { type: 'demo', fen: START, moves: [['f2f3', T('نقلة ضعيفة تكشف الملك.', 'A weak move that exposes the king.')], ['e7e5', T('يفتح الطريق للوزير.', 'Opens the queen\'s diagonal.')], ['g2g4', T('خطأ فادح!', 'A blunder!')], ['d8h4', T('كش مات في نقلتين فقط: «مات الأحمق»، أقصر مباراة ممكنة.', 'Mate in two moves — Fool\'s mate, the shortest possible game.')]] },
      ] },
    ],
  },
  // ======================================================================
  {
    id: 'strategy', icon: 'brain', color: '#4f46e5',
    title: T('الخطط والاستراتيجية', 'Plans & strategy'), desc: T('كيف تفكر وتضع خطة في وسط المباراة', 'How to think and plan in the middlegame'),
    lessons: [
      { id: 's-files', title: T('الأعمدة المفتوحة', 'Open files'), steps: [
        { type: 'info', fen: '2r3k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1', marks: { d2: 'good', d3: 'good', d4: 'good', d5: 'good', d6: 'good', d7: 'good', d8: 'good' }, text: T('العمود المفتوح هو العمود الخالي من البيادق. ضع رخك عليه ليسيطر على العمود كله ويصل إلى صفوف الخصم.', 'An open file has no pawns on it. Put your rook there to control the whole file and break into the enemy camp.') },
        { type: 'task', fen: '6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1', solution: ['a1a8'], acceptMate: true, text: T('استغل العمود المفتوح وأعطِ كش مات.', 'Use the open file to give checkmate.') },
      ] },
      { id: 's-outpost', title: T('المربع القوي للحصان', 'Knight outposts'), steps: [
        { type: 'info', fen: 'r4rk1/pp3ppp/3p4/2pN4/2P1P3/8/PP3PPP/R4RK1 w - - 0 1', marks: { d5: 'good' }, text: T('«المربع القوي» مربع في معسكر الخصم يحميه بيدقك ولا يستطيع أي بيدق للخصم طرد قطعتك منه. الحصان على d5 هنا قوي جدًّا.', 'An outpost is a square in enemy territory protected by your pawn that no enemy pawn can attack. The knight on d5 is a monster.') },
        { type: 'quiz', fen: 'r4rk1/pp3ppp/3p4/2pN4/2P1P3/8/PP3PPP/R4RK1 w - - 0 1', q: T('لماذا الحصان على d5 قوي؟', 'Why is the d5 knight so strong?'), options: [T('لأن البيدقين c4 وe4 يحميانه ولا يستطيع أي بيدق أسود مهاجمته', 'Pawns protect it and no black pawn can attack it'), T('لأنه قريب من ملكه', 'It is close to its king'), T('لأنه على مربع فاتح', 'It stands on a light square')], answer: 0, explain: T('بيدقا c6 وe6 اختفيا، فلا شيء يطرده.', 'The c- and e-pawns that could kick it are gone.') },
      ] },
      { id: 's-passed', title: T('البيدق الحر', 'The passed pawn'), steps: [
        { type: 'info', fen: '6k1/5ppp/8/1P6/8/8/5PPP/6K1 w - - 0 1', marks: { b5: 'good', b6: 'good', b7: 'good', b8: 'good' }, text: T('«البيدق الحر» هو البيدق الذي لا يعترضه أي بيدق للخصم في عموده ولا في العمودين المجاورين. يجب دفعه إلى الأمام، فهو مرشح للترقية.', 'A passed pawn has no enemy pawns in front of it on its own or neighbouring files. Push it — it wants to promote.') },
        { type: 'play', fen: '6k1/5ppp/8/1P6/8/8/5PPP/6K1 w - - 0 1', goal: 'promote', maxMoves: 12, text: T('ادفع البيدق الحر حتى يترقّى، والكمبيوتر يحاول إيقافه.', 'Push the passed pawn to promotion; the computer will try to stop it.') },
      ] },
      { id: 's-king', title: T('أمان الملك وتفعيله', 'King safety & activity'), steps: [
        { type: 'info', fen: 'r1bq1rk1/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQ1RK1 w - - 0 1', text: T('في الافتتاح ووسط المباراة يجب أن يبقى الملك آمنًا خلف بيادقه بعد التبييت، فلا تحرّك بيادق التبييت دون سبب.', 'In the opening and middlegame, keep your king safe behind its pawns after castling; don\'t push those pawns without reason.') },
        { type: 'info', fen: '8/5k2/8/3K4/8/8/8/8 w - - 0 1', text: T('أما في نهاية المباراة، حين تقل القطع، فيصبح الملك قطعة مقاتلة قوية: أدخله إلى المركز ليساعد بيادقك.', 'In the endgame, with few pieces left, the king becomes a strong fighter: bring it to the centre to help your pawns.') },
        { type: 'quiz', q: T('في نهاية المباراة، أين يكون مكان الملك عادةً؟', 'In the endgame, where does the king usually belong?'), options: [T('في المركز يشارك في اللعب', 'In the centre, taking part'), T('في الزاوية مختبئًا', 'Hiding in the corner')], answer: 0, explain: T('مع قلة القطع يقل خطر الكش مات، فيستفيد اللاعب من قوة الملك.', 'With few pieces left there is little mating danger, so the king should be used.') },
      ] },
    ],
  },
  // ======================================================================
  {
    id: 'endgames', icon: 'trophy', color: '#15803d',
    title: T('النهايات الأساسية', 'Basic endgames'), desc: T('كيف تنهي المباراة وتحقق الكش مات', 'How to finish the game and deliver mate'),
    lessons: [
      { id: 'e-kq', title: T('مات الملك والوزير', 'King & queen mate'), steps: [
        { type: 'info', fen: '8/8/8/3k4/8/8/8/2Q1K3 w - - 0 1', text: T('الخطة: استخدم الوزير لتضييق المساحة على الملك خطوة بخطوة دون أن تخنقه، ثم قرّب ملكك ليحمي الوزير في الكش مات الأخير. احذر من «الملك المخنوق»!', 'Plan: use the queen to shrink the king\'s box step by step without stalemating it, then bring your king to support the final mate. Beware of stalemate!') },
        { type: 'play', fen: '8/8/8/3k4/8/8/8/2Q1K3 w - - 0 1', goal: 'mate', maxMoves: 25, text: T('أعطِ كش مات خلال 25 نقلة.', 'Checkmate within 25 moves.') },
      ] },
      { id: 'e-kr', title: T('مات الملك والرخ', 'King & rook mate'), steps: [
        { type: 'info', fen: '8/8/8/4k3/8/8/8/R3K3 w - - 0 1', text: T('الرخ يقطع الملك في جزء من الرقعة، ويتقدم ملكك ليواجه ملك الخصم، ثم يضيّق الرخ المساحة صفًّا بعد صف حتى الكش مات على الحافة.', 'The rook cuts the king off, your king approaches to face the enemy king, then the rook shrinks the box rank by rank until mate on the edge.') },
        { type: 'play', fen: '8/8/8/4k3/8/8/8/R3K3 w - - 0 1', goal: 'mate', maxMoves: 35, text: T('أعطِ كش مات خلال 35 نقلة.', 'Checkmate within 35 moves.') },
      ] },
      { id: 'e-pawn', title: T('الملك والبيدق ضد الملك', 'King & pawn vs king'), steps: [
        { type: 'info', fen: '4k3/8/4K3/4P3/8/8/8/8 w - - 0 1', text: T('قاعدة مهمة: إذا وصل ملكك إلى الصف السادس أمام بيدقك (في غير عمودي a وh) فالفوز مضمون. «المعارضة» تعني أن يقف الملكان متقابلين بينهما مربع واحد، ومن عليه الدور يضطر إلى التراجع.', 'Key rule: if your king reaches the sixth rank in front of its pawn (not on the a- or h-file), it is a win. Opposition means the kings face each other with one square between; the side to move must give way.') },
        { type: 'play', fen: '4k3/8/4K3/4P3/8/8/8/8 w - - 0 1', goal: 'promote', maxMoves: 15, text: T('رقِّ البيدق دون أن تفقده ودون ملك مخنوق.', 'Promote the pawn without losing it or stalemating.') },
      ] },
    ],
  },
  // ======================================================================
  { id: 'puzzles', icon: 'puzzle', color: '#0891b2', special: 'puzzles', title: T('الألغاز', 'Puzzles'), desc: T('مئات الألغاز المتدرجة من السهل إلى الصعب', 'Hundreds of puzzles from easy to hard'), lessons: [] },
  // ======================================================================
  {
    id: 'quizzes', icon: 'circle-help', color: '#ea580c',
    title: T('الاختبارات', 'Quizzes'), desc: T('اختبر معلوماتك في القواعد والافتتاح والتكتيك', 'Test your knowledge of rules, openings and tactics'),
    lessons: [
      { id: 'q-rules', title: T('اختبار القواعد', 'Rules quiz'), quiz: true, steps: [
        { type: 'quiz', q: T('كم مربعًا في رقعة الشطرنج؟', 'How many squares are on a chessboard?'), options: [T('32', '32'), T('64', '64'), T('81', '81')], answer: 1, explain: T('8 × 8 = 64 مربعًا.', '8 × 8 = 64.') },
        { type: 'quiz', q: T('أي القطع تستطيع القفز فوق القطع الأخرى؟', 'Which piece can jump over others?'), options: [T('الفيل', 'Bishop'), T('الحصان', 'Knight'), T('الرخ', 'Rook')], answer: 1, explain: T('الحصان وحده يقفز.', 'Only the knight jumps.') },
        { type: 'quiz', q: T('من يبدأ المباراة؟', 'Who moves first?'), options: [T('الأبيض', 'White'), T('الأسود', 'Black'), T('بالقرعة', 'Decided by lot')], answer: 0, explain: T('الأبيض يبدأ دائمًا.', 'White always moves first.') },
        { type: 'quiz', q: T('هل يجوز التبييت والملك في كش؟', 'May you castle while in check?'), options: [T('نعم', 'Yes'), T('لا', 'No')], answer: 1, explain: T('لا يجوز التبييت والملك في كش.', 'Castling out of check is not allowed.') },
        { type: 'quiz', q: T('ماذا يحدث إذا وصل البيدق إلى الصف الأخير؟', 'What happens when a pawn reaches the last rank?'), options: [T('يعود إلى مكانه', 'It goes back'), T('يُرقّى إلى قطعة أخرى غير الملك', 'It promotes to any piece except a king'), T('يُزال من الرقعة', 'It is removed')], answer: 1, explain: T('يُرقّى إلى وزير أو رخ أو فيل أو حصان.', 'It becomes a queen, rook, bishop or knight.') },
        { type: 'quiz', fen: '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1', q: T('دور الأسود. ما النتيجة؟', 'Black to move. What is the result?'), options: [T('كش مات', 'Checkmate'), T('تعادل (ملك مخنوق)', 'Draw (stalemate)')], answer: 1, explain: T('الملك ليس في كش ولا يملك نقلة قانونية.', 'Not in check and no legal moves.') },
        { type: 'quiz', q: T('كم قيمة الرخ تقريبًا؟', 'Roughly how much is a rook worth?'), options: [T('3', '3'), T('5', '5'), T('9', '9')], answer: 1, explain: T('الرخ 5 نقاط.', 'A rook is 5 points.') },
        { type: 'quiz', q: T('ما اسم الأخذ الخاص الذي يقوم به البيدق لبيدق تقدم مربعين بجواره؟', 'What is the special pawn capture of a pawn that just advanced two squares beside it?'), options: [T('التبييت', 'Castling'), T('الأخذ بالتجاوز', 'En passant'), T('الترقية', 'Promotion')], answer: 1, explain: T('الأخذ بالتجاوز (en passant).', 'En passant.') },
      ] },
      { id: 'q-tactics', title: T('اختبار التكتيك', 'Tactics quiz'), quiz: true, steps: [
        { type: 'quiz', fen: 'r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1', q: T('ما أفضل نقلة للأبيض؟', 'What is White\'s best move?'), options: [T('Nc7+ (شوكة)', 'Nc7+ (fork)'), T('Nd6+', 'Nd6+'), T('Ke2', 'Ke2')], answer: 0, explain: T('Nc7+ يهاجم الملك والرخ معًا.', 'Nc7+ forks the king and rook.') },
        { type: 'quiz', fen: '6k1/5ppp/8/8/8/8/8/3R2K1 w - - 0 1', q: T('كيف يعطي الأبيض كش مات في نقلة؟', 'How does White mate in one?'), options: [T('Rd7', 'Rd7'), T('Rd8#', 'Rd8#'), T('Kf2', 'Kf2')], answer: 1, explain: T('مات الصف الأخير: Rd8#.', 'Back-rank mate: Rd8#.') },
        { type: 'quiz', fen: '4k3/8/2n5/1B6/8/8/8/4K3 b - - 0 1', q: T('ما اسم هذا التكتيك: الحصان لا يستطيع الحركة لأن خلفه الملك؟', 'What is it called when the knight cannot move because the king is behind it?'), options: [T('تثبيت', 'A pin'), T('شوكة', 'A fork'), T('سيخ', 'A skewer')], answer: 0, explain: T('هذا تثبيت مطلق، لأن خلف الحصان الملك.', 'An absolute pin — the king is behind it.') },
        { type: 'quiz', fen: '6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1', q: T('أي نقلة تعطي المات الخانق؟', 'Which move gives smothered mate?'), options: [T('Nf7#', 'Nf7#'), T('Nh7', 'Nh7'), T('Ne6', 'Ne6')], answer: 0, explain: T('Nf7# والملك محاصر بقطعه.', 'Nf7# — the king is boxed in by its own pieces.') },
        { type: 'quiz', q: T('ماذا نسمي هجوم قطعة واحدة على قطعتين معًا؟', 'What do we call one piece attacking two at once?'), options: [T('شوكة', 'A fork'), T('تبييت', 'Castling'), T('معارضة', 'Opposition')], answer: 0, explain: T('هذه هي الشوكة.', 'That is a fork.') },
      ] },
      { id: 'q-openings', title: T('اختبار الافتتاحيات', 'Openings quiz'), quiz: true, steps: [
        { type: 'quiz', q: T('ما النقلة التي تميّز الدفاع الصقلي بعد 1.e4؟', 'Which move defines the Sicilian after 1.e4?'), options: [T('1...e5', '1...e5'), T('1...c5', '1...c5'), T('1...e6', '1...e6')], answer: 1, explain: T('1...c5 هي الصقلية.', '1...c5 is the Sicilian.') },
        { type: 'quiz', q: T('ما الافتتاحية التي يُعرض فيها بيدق c4 بعد 1.d4 d5؟', 'Which opening offers the c-pawn after 1.d4 d5?'), options: [T('غامبيت الوزير', 'Queen\'s Gambit'), T('الإيطالية', 'Italian'), T('الإنجليزية', 'English')], answer: 0, explain: T('2.c4 هو غامبيت الوزير.', '2.c4 is the Queen\'s Gambit.') },
        { type: 'quiz', q: T('في الافتتاحية الإيطالية، إلى أي مربع يذهب فيل الأبيض في النقلة الثالثة؟', 'In the Italian, where does White\'s bishop go on move 3?'), options: [T('b5', 'b5'), T('c4', 'c4'), T('e2', 'e2')], answer: 1, explain: T('3.Bc4 يستهدف f7.', '3.Bc4 eyes f7.') },
        { type: 'quiz', q: T('أي دفاع يبدأ بالنقلة 1...e6 ردًّا على 1.e4؟', 'Which defence starts 1...e6 against 1.e4?'), options: [T('الفرنسي', 'French'), T('كارو-كان', 'Caro-Kann'), T('الإسكندنافي', 'Scandinavian')], answer: 0, explain: T('1...e6 هو الدفاع الفرنسي.', '1...e6 is the French.') },
        { type: 'quiz', q: T('أي مما يلي من مبادئ الافتتاح؟', 'Which of these is an opening principle?'), options: [T('حرّك الوزير كثيرًا', 'Move the queen a lot'), T('طوّر القطع وبيّت الملك', 'Develop and castle'), T('حرّك بيادق الأطراف أولًا', 'Push the edge pawns first')], answer: 1, explain: T('التطوير والتبييت والسيطرة على المركز.', 'Develop, castle and control the centre.') },
      ] },
    ],
  },
];
