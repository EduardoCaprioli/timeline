/* ════════════════════════════════════════════════════════════
   TIMELINE SYSTEM — Banco de Dados de Eventos
   ════════════════════════════════════════════════════════════
   Schema:
     id         — slug estável (URL: #/e/{id})
     y, m       — ano, mês (número 1-12)
     d          — data formatada para exibição
     era        — nome da era (agrupador macro)
     track      — pista primária: hardware | software | ia | rede | cultura
     t, x       — título e descrição
     tg         — tags (para cores)
     parents    — ids de eventos que causaram este
     importance — 1 a 5 (tamanho na constellation view)
     img        — URL hero image
     imgCredit  — crédito
     imgType    — "ai" (gerada) ou "contributed"
     quote?     — { text, by } — citação icônica opcional
     video?     — YouTube embed ID opcional
   ════════════════════════════════════════════════════════════ */

const EVENTS = [
  {
    id: "telefone-1876", y: 1876, m: 3, d: "MAR · 1876", era: "Era Industrial",
    track: "rede",
    t: "A Voz Cruza o Mundo pela Primeira Vez",
    x: "Alexander Graham Bell patenteia o telefone — o primeiro dispositivo capaz de transmitir voz humana através de fios elétricos. Comunicações que levavam semanas tornam-se instantâneas. A humanidade jamais conversaria do mesmo jeito.",
    tg: ["comunicação", "hardware"], parents: [], importance: 4,
    img: "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=1600&q=80",
    imgCredit: "Acervo · Telephone heritage", imgType: "contributed",
    quote: { text: "Mr. Watson — come here — I want to see you.", by: "Alexander Graham Bell, primeira chamada telefônica" }
  },
  {
    id: "lampada-1879", y: 1879, m: 10, d: "OUT · 1879", era: "Era Industrial",
    track: "hardware",
    t: "A Noite é Conquistada",
    x: "Edison apresenta a lâmpada incandescente comercialmente viável. A humanidade, pela primeira vez em sua história, deixa de depender do sol para trabalhar, estudar e viver.",
    tg: ["hardware", "engenharia"], parents: [], importance: 3,
    img: "https://images.unsplash.com/photo-1507146153580-69a1fe6d8aa1?w=1600&q=80",
    imgCredit: "Unsplash · Lightbulb legacy", imgType: "contributed"
  },
  {
    id: "voo-1903", y: 1903, m: 12, d: "DEZ · 1903", era: "Era Industrial",
    track: "hardware",
    t: "O Primeiro Voo",
    x: "Os irmãos Wright realizam o primeiro voo controlado da história em Kitty Hawk. Apenas 12 segundos no ar, mas suficientes para mudar permanentemente nossa relação com espaço, distância e o impossível.",
    tg: ["transporte", "engenharia"], parents: [], importance: 4,
    img: "https://images.unsplash.com/photo-1540962351504-03099e0a754b?w=1600&q=80",
    imgCredit: "Wikimedia · Wright Brothers", imgType: "contributed"
  },
  {
    id: "radio-1920", y: 1920, m: 11, d: "NOV · 1920", era: "Era Industrial",
    track: "rede",
    t: "A Primeira Transmissão de Rádio Comercial",
    x: "A estação KDKA transmite as eleições presidenciais americanas. Pela primeira vez, uma mensagem alcança milhares de pessoas simultaneamente — nasce a mídia de massa.",
    tg: ["comunicação", "cultura"], parents: ["telefone-1876"], importance: 3,
    img: "https://images.unsplash.com/photo-1593078165899-c7d2ac0491bd?w=1600&q=80",
    imgCredit: "Vintage radio archive", imgType: "contributed"
  },
  {
    id: "turing-1936", y: 1936, m: 5, d: "MAI · 1936", era: "Era da Computação",
    track: "ia",
    t: "Nasce a Ciência da Computação",
    x: "Alan Turing publica 'On Computable Numbers', definindo matematicamente o que uma máquina pode computar. A 'Máquina de Turing' é a certidão de nascimento de tudo que viria depois — computadores, software, e a própria inteligência artificial.",
    tg: ["computação", "ciência"], parents: [], importance: 5,
    img: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1600&q=80",
    imgCredit: "Gerada por IA · Computing origins", imgType: "ai",
    quote: { text: "We can only see a short distance ahead, but we can see plenty there that needs to be done.", by: "Alan Turing" }
  },
  {
    id: "eniac-1946", y: 1946, m: 2, d: "FEV · 1946", era: "Era da Computação",
    track: "hardware",
    t: "ENIAC: O Primeiro Computador Eletrônico",
    x: "A Universidade da Pensilvânia apresenta o ENIAC — 30 toneladas, 17.468 válvulas, capaz de realizar 5.000 cálculos por segundo. O que antes exigia exércitos de calculistas humanos agora acontece em silêncio, numa sala inteira de máquina.",
    tg: ["computação", "hardware"], parents: ["turing-1936"], importance: 4,
    img: "https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=1600&q=80",
    imgCredit: "Computing History Archive", imgType: "contributed"
  },
  {
    id: "transistor-1947", y: 1947, m: 12, d: "DEZ · 1947", era: "Era da Computação",
    track: "hardware",
    t: "O Transistor Muda Tudo",
    x: "Nos Bell Labs, Shockley, Bardeen e Brattain criam o transistor — um componente minúsculo que substitui válvulas enormes. Abre o caminho para toda a eletrônica moderna: rádios, TVs, computadores, smartphones. Tudo nasce daqui.",
    tg: ["hardware", "ciência"], parents: ["eniac-1946"], importance: 5,
    img: "https://images.unsplash.com/photo-1555664424-778a1e5e1b48?w=1600&q=80",
    imgCredit: "Bell Labs Archive", imgType: "contributed"
  },
  {
    id: "perceptron-1958", y: 1958, m: 7, d: "JUL · 1958", era: "Era da Computação",
    track: "ia",
    t: "A Primeira Rede Neural",
    x: "Frank Rosenblatt apresenta o Perceptron — uma máquina capaz de aprender a reconhecer padrões visuais. A imprensa proclama: 'o embrião de um computador eletrônico que a Marinha espera que seja capaz de caminhar, falar, ver e reproduzir-se'.",
    tg: ["ia", "ciência"], parents: ["turing-1936", "transistor-1947"], importance: 4,
    img: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=1600&q=80",
    imgCredit: "Gerada por IA · Neural origins", imgType: "ai"
  },
  {
    id: "ic-1958", y: 1958, m: 9, d: "SET · 1958", era: "Era da Computação",
    track: "hardware",
    t: "O Circuito Integrado",
    x: "Jack Kilby, na Texas Instruments, cria o primeiro circuito integrado. Múltiplos transistores num único chip — o DNA do microchip que faria a Lei de Moore possível por meio século.",
    tg: ["hardware", "ciência"], parents: ["transistor-1947"], importance: 4,
    img: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1600&q=80",
    imgCredit: "Gerada por IA · Silicon chip", imgType: "ai"
  },
  {
    id: "lua-1969", y: 1969, m: 7, d: "JUL · 1969", era: "Era Espacial",
    track: "hardware",
    t: "O Homem Pisa na Lua",
    x: "Apollo 11 pousa no Mar da Tranquilidade. Neil Armstrong desce pela escada e profere uma das frases mais memorizadas da história. O computador de bordo tinha menos poder que uma calculadora atual — a engenharia humana triunfou sobre os limites do possível.",
    tg: ["transporte", "ciência", "cultura"], parents: ["ic-1958", "eniac-1946"], importance: 5,
    img: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1600&q=80",
    imgCredit: "NASA · Apollo 11", imgType: "contributed",
    quote: { text: "That's one small step for man, one giant leap for mankind.", by: "Neil Armstrong" },
    video: "cwZb2mqId0A"
  },
  {
    id: "arpanet-1969", y: 1969, m: 10, d: "OUT · 1969", era: "Era da Computação",
    track: "rede",
    t: "A Internet Nasce em Silêncio",
    x: "Às 22h30 de 29 de outubro, a primeira mensagem é enviada entre UCLA e Stanford pela ARPANET. Tentou-se escrever 'LOGIN' — o sistema travou após 'LO'. Mesmo um começo imperfeito bastou para mudar tudo. O que começou como projeto militar tornou-se a maior rede da história humana.",
    tg: ["internet", "comunicação"], parents: ["transistor-1947", "ic-1958"], importance: 5,
    img: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1600&q=80",
    imgCredit: "Gerada por IA · Network dawn", imgType: "ai"
  },
  {
    id: "unix-1971", y: 1971, m: 11, d: "NOV · 1971", era: "Era da Computação",
    track: "software",
    t: "Unix Nasce nos Bell Labs",
    x: "Ken Thompson e Dennis Ritchie criam o Unix — um sistema operacional simples, elegante, construído sobre filosofia: 'faça uma coisa e faça bem'. 50 anos depois, seu DNA corre em Linux, macOS, iOS, Android e em quase todo servidor do planeta.",
    tg: ["software", "computação"], parents: ["transistor-1947"], importance: 5,
    img: "https://images.unsplash.com/photo-1629654297299-c8506221ca97?w=1600&q=80",
    imgCredit: "Gerada por IA · Terminal origins", imgType: "ai"
  },
  {
    id: "email-1971", y: 1971, m: 10, d: "OUT · 1971", era: "Era da Computação",
    track: "rede",
    t: "O Primeiro E-mail",
    x: "Ray Tomlinson envia o primeiro e-mail entre computadores distintos e escolhe o símbolo '@' para separar usuário e host. Uma decisão de design que se tornaria o ícone universal da conexão digital.",
    tg: ["internet", "comunicação"], parents: ["arpanet-1969"], importance: 4,
    img: "https://images.unsplash.com/photo-1596526131083-e8c633c948d2?w=1600&q=80",
    imgCredit: "Gerada por IA · At sign", imgType: "ai"
  },
  {
    id: "altair-1975", y: 1975, m: 1, d: "JAN · 1975", era: "Era do PC",
    track: "hardware",
    t: "Altair 8800: O PC Chega",
    x: "A revista Popular Electronics traz o Altair 8800 na capa. Pela primeira vez, hobbyistas podem ter um computador em casa por menos de 400 dólares. Um jovem Bill Gates escreve o BASIC para ele — e funda a Microsoft.",
    tg: ["hardware", "negócios"], parents: ["ic-1958"], importance: 4,
    img: "https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=1600&q=80",
    imgCredit: "Computing History Museum", imgType: "contributed"
  },
  {
    id: "apple-1976", y: 1976, m: 4, d: "ABR · 1976", era: "Era do PC",
    track: "hardware",
    t: "Apple Nasce em uma Garagem",
    x: "Steve Jobs, Steve Wozniak e Ronald Wayne fundam a Apple Computer Company em Cupertino. O Apple I é vendido como kit para hobbyistas — o início de uma das empresas mais valiosas da história humana.",
    tg: ["hardware", "negócios"], parents: ["altair-1975"], importance: 5,
    img: "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=1600&q=80",
    imgCredit: "Gerada por IA · Garage workshop", imgType: "ai"
  },
  {
    id: "microsoft-1975", y: 1975, m: 4, d: "ABR · 1975", era: "Era do PC",
    track: "software",
    t: "Microsoft é Fundada",
    x: "Bill Gates e Paul Allen fundam a Microsoft. Sua aposta: um dia todo computador terá software, e alguém precisa escrevê-lo. Em três décadas, redefinirão como o mundo usa computadores.",
    tg: ["software", "negócios"], parents: ["altair-1975"], importance: 4,
    img: "https://images.unsplash.com/photo-1633409361618-c73427e4e206?w=1600&q=80",
    imgCredit: "Gerada por IA · Early software", imgType: "ai"
  },
  {
    id: "ibmpc-1981", y: 1981, m: 8, d: "AGO · 1981", era: "Era do PC",
    track: "hardware",
    t: "IBM Legitima o Computador Pessoal",
    x: "A IBM lança o 5150 Personal Computer — e dá poder à Microsoft com o MS-DOS. Empresas do mundo inteiro passam a comprar PCs. O 'computador na mesa' deixa de ser hobby e vira infraestrutura empresarial.",
    tg: ["hardware", "negócios"], parents: ["apple-1976", "microsoft-1975"], importance: 4,
    img: "https://images.unsplash.com/photo-1587620962725-abab7fe55159?w=1600&q=80",
    imgCredit: "Vintage computing", imgType: "contributed"
  },
  {
    id: "macintosh-1984", y: 1984, m: 1, d: "JAN · 1984", era: "Era do PC",
    track: "hardware",
    t: "O Macintosh e o Computador para o Resto de Nós",
    x: "Apresentado durante o Super Bowl com o célebre comercial '1984', o Macintosh traz interface gráfica e mouse ao grande público. A computação deixa de ser texto em tela preta — torna-se visual, intuitiva, pessoal.",
    tg: ["hardware", "cultura", "software"], parents: ["apple-1976", "ibmpc-1981"], importance: 5,
    img: "https://images.unsplash.com/photo-1527434752233-74dda4ad87ed?w=1600&q=80",
    imgCredit: "Gerada por IA · Classic Mac", imgType: "ai",
    quote: { text: "Here's to the crazy ones.", by: "Apple · Think Different" }
  },
  {
    id: "tcp-1983", y: 1983, m: 1, d: "JAN · 1983", era: "Era da Computação",
    track: "rede",
    t: "TCP/IP Unifica as Redes",
    x: "A ARPANET migra oficialmente para TCP/IP — o protocolo que permitiria redes distintas se interconectarem. Essa é a data técnica do nascimento da Internet como a conhecemos: uma rede de redes.",
    tg: ["internet", "comunicação"], parents: ["arpanet-1969", "email-1971"], importance: 4,
    img: "https://images.unsplash.com/photo-1563089145-599997674d42?w=1600&q=80",
    imgCredit: "Gerada por IA · Network protocol", imgType: "ai"
  },
  {
    id: "windows-1985", y: 1985, m: 11, d: "NOV · 1985", era: "Era do PC",
    track: "software",
    t: "Windows Chega ao PC",
    x: "Microsoft lança o Windows 1.0. Em 10 anos, estaria em 90% dos PCs do planeta. A era da interface gráfica no ambiente IBM-compatível começa aqui.",
    tg: ["software", "negócios"], parents: ["ibmpc-1981", "macintosh-1984"], importance: 4,
    img: "https://images.unsplash.com/photo-1624996379697-f01d168b1a52?w=1600&q=80",
    imgCredit: "Gerada por IA · GUI era", imgType: "ai"
  },
  {
    id: "www-1989", y: 1989, m: 3, d: "MAR · 1989", era: "Era da Internet",
    track: "rede",
    t: "A World Wide Web é Inventada",
    x: "No CERN em Genebra, Tim Berners-Lee propõe um sistema de documentos hipertextuais conectados em rede. Ele escreve o primeiro browser, o primeiro servidor e o primeiro site — e dá tudo ao domínio público. A Web transforma a Internet de ferramenta acadêmica em fenômeno cultural global.",
    tg: ["internet", "software"], parents: ["tcp-1983", "unix-1971"], importance: 5,
    img: "https://images.unsplash.com/photo-1563089145-599997674d42?w=1600&q=80",
    imgCredit: "CERN Archive", imgType: "contributed",
    quote: { text: "The Web is more a social creation than a technical one.", by: "Tim Berners-Lee" }
  },
  {
    id: "linux-1991", y: 1991, m: 8, d: "AGO · 1991", era: "Era da Internet",
    track: "software",
    t: "Linus Torvalds Posta uma Mensagem",
    x: "Em um fórum Usenet, um estudante finlandês de 21 anos anuncia: 'estou fazendo um sistema operacional (apenas um hobby, nada grande e profissional)'. Aquela mensagem foi o começo do Linux — que hoje roda em servidores, smartphones, supercomputadores e geladeiras no mundo inteiro.",
    tg: ["software", "cultura"], parents: ["unix-1971"], importance: 5,
    img: "https://images.unsplash.com/photo-1629654297299-c8506221ca97?w=1600&q=80",
    imgCredit: "Gerada por IA · Open source", imgType: "ai"
  },
  {
    id: "mosaic-1993", y: 1993, m: 4, d: "ABR · 1993", era: "Era da Internet",
    track: "software",
    t: "Mosaic: O Primeiro Browser Gráfico",
    x: "Estudantes da Universidade de Illinois lançam o Mosaic — o primeiro navegador a exibir imagens embutidas no texto. De repente, a Web deixa de ser acadêmica e vira visualmente sedutora. Termina o ano com 1 milhão de usuários.",
    tg: ["software", "internet"], parents: ["www-1989"], importance: 4,
    img: "https://images.unsplash.com/photo-1522542550221-31fd19575a2d?w=1600&q=80",
    imgCredit: "Gerada por IA · Web browsers", imgType: "ai"
  },
  {
    id: "amazon-1994", y: 1994, m: 7, d: "JUL · 1994", era: "Era da Internet",
    track: "cultura",
    t: "Amazon Nasce como Livraria Online",
    x: "Jeff Bezos abandona Wall Street e funda a Amazon em sua garagem em Seattle. Começa como livraria — mas Bezos sempre quis 'vender tudo'. Três décadas depois, redefiniria varejo, logística, computação em nuvem e o próprio conceito de cliente.",
    tg: ["internet", "negócios", "cultura"], parents: ["mosaic-1993"], importance: 4,
    img: "https://images.unsplash.com/photo-1529646286004-4445ca2cca9a?w=1600&q=80",
    imgCredit: "Gerada por IA · E-commerce dawn", imgType: "ai"
  },
  {
    id: "java-1995", y: 1995, m: 5, d: "MAI · 1995", era: "Era da Internet",
    track: "software",
    t: "Java: Write Once, Run Anywhere",
    x: "A Sun Microsystems lança o Java. A promessa 'escreva uma vez, rode em qualquer lugar' transforma como software corporativo é construído. Três décadas depois ainda é a espinha dorsal de bancos, governos e Android.",
    tg: ["software"], parents: ["unix-1971"], importance: 3,
    img: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=1600&q=80",
    imgCredit: "Unsplash · Coding", imgType: "contributed"
  },
  {
    id: "google-1998", y: 1998, m: 9, d: "SET · 1998", era: "Era da Internet",
    track: "rede",
    t: "Google Indexa o Mundo",
    x: "Larry Page e Sergey Brin fundam o Google em uma garagem em Menlo Park. Seu algoritmo PageRank mede a importância de páginas pela confiança de quem as cita — uma ideia emprestada da academia. Em uma década, redefiniria como a humanidade encontra qualquer coisa.",
    tg: ["internet", "negócios", "ia"], parents: ["www-1989", "mosaic-1993"], importance: 5,
    img: "https://images.unsplash.com/photo-1573804633927-bfcbcd909acd?w=1600&q=80",
    imgCredit: "Gerada por IA · Search engine", imgType: "ai",
    quote: { text: "The perfect search engine would understand exactly what you mean and give back exactly what you want.", by: "Larry Page" }
  },
  {
    id: "napster-1999", y: 1999, m: 6, d: "JUN · 1999", era: "Era da Internet",
    track: "cultura",
    t: "Napster e a Disrupção da Música",
    x: "Shawn Fanning, 18 anos, lança o Napster. Em meses, 80 milhões de pessoas compartilham músicas gratuitamente. A indústria fonográfica processa e vence no tribunal — mas perde a guerra cultural. O mundo nunca mais compraria CDs da mesma forma.",
    tg: ["internet", "cultura"], parents: ["mosaic-1993"], importance: 4,
    img: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=1600&q=80",
    imgCredit: "Unsplash · Music sharing", imgType: "contributed"
  },
  {
    id: "wikipedia-2001", y: 2001, m: 1, d: "JAN · 2001", era: "Era da Internet",
    track: "cultura",
    t: "Wikipedia: Todo Conhecimento para Todos",
    x: "Jimmy Wales e Larry Sanger lançam a Wikipedia — uma enciclopédia aberta, editável por qualquer pessoa. Céticos previram o caos. Vinte anos depois, é a sétima página mais visitada do planeta e um dos projetos colaborativos mais bem-sucedidos da história humana.",
    tg: ["internet", "cultura"], parents: ["www-1989"], importance: 4,
    img: "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=1600&q=80",
    imgCredit: "Unsplash · Knowledge", imgType: "contributed"
  },
  {
    id: "ipod-2001", y: 2001, m: 10, d: "OUT · 2001", era: "Era Mobile",
    track: "hardware",
    t: "iPod: Mil Músicas no Bolso",
    x: "Steve Jobs apresenta o iPod. 'A thousand songs in your pocket.' A forma como ouvimos música muda para sempre — e a Apple começa a transição de empresa de computadores para empresa de dispositivos de consumo.",
    tg: ["hardware", "cultura"], parents: ["napster-1999", "macintosh-1984"], importance: 4,
    img: "https://images.unsplash.com/photo-1484704849700-f032a568e944?w=1600&q=80",
    imgCredit: "Unsplash · iPod legacy", imgType: "contributed"
  },
  {
    id: "facebook-2004", y: 2004, m: 2, d: "FEV · 2004", era: "Era Social",
    track: "cultura",
    t: "Facebook é Criado em um Dormitório",
    x: "Mark Zuckerberg, 19 anos, lança o thefacebook.com em Harvard. Em 20 anos, conectaria metade da humanidade — e redefiniria privacidade, política, jornalismo e o próprio conceito de 'amigo'.",
    tg: ["internet", "cultura", "negócios"], parents: ["google-1998"], importance: 5,
    img: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=1600&q=80",
    imgCredit: "Gerada por IA · Social network", imgType: "ai"
  },
  {
    id: "gmail-2004", y: 2004, m: 4, d: "ABR · 2004", era: "Era da Internet",
    track: "software",
    t: "Gmail: 1 GB Grátis",
    x: "Google lança o Gmail em 1º de abril — tantos acharam que era pegadinha. 1 gigabyte de armazenamento (100x mais que a concorrência), busca instantânea e conversas em thread. Redefine o padrão de e-mail para sempre.",
    tg: ["software", "internet"], parents: ["google-1998", "email-1971"], importance: 3,
    img: "https://images.unsplash.com/photo-1596526131083-e8c633c948d2?w=1600&q=80",
    imgCredit: "Gerada por IA · Email evolution", imgType: "ai"
  },
  {
    id: "youtube-2005", y: 2005, m: 2, d: "FEV · 2005", era: "Era Social",
    track: "cultura",
    t: "YouTube: Todos Viramos Canais",
    x: "Três ex-funcionários do PayPal lançam o YouTube. 'Me at the zoo' — 19 segundos de um cara no zoológico — é o primeiro vídeo. Em 10 anos, o YouTube teria mais audiência que qualquer emissora de TV do planeta.",
    tg: ["internet", "cultura"], parents: ["napster-1999", "mosaic-1993"], importance: 4,
    img: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=1600&q=80",
    imgCredit: "Unsplash · Video culture", imgType: "contributed"
  },
  {
    id: "aws-2006", y: 2006, m: 3, d: "MAR · 2006", era: "Era da Nuvem",
    track: "rede",
    t: "AWS Inventa a Computação em Nuvem",
    x: "Amazon lança o S3 e o EC2 — servidores sob demanda, pagos por hora. Startups que antes precisavam de milhões em hardware agora podiam escalar com cartão de crédito. Quase toda unicórnio da década seguinte nasceria sobre esta fundação.",
    tg: ["internet", "negócios"], parents: ["amazon-1994", "linux-1991"], importance: 5,
    img: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1600&q=80",
    imgCredit: "Gerada por IA · Cloud infrastructure", imgType: "ai"
  },
  {
    id: "twitter-2006", y: 2006, m: 3, d: "MAR · 2006", era: "Era Social",
    track: "cultura",
    t: "Twitter: 140 Caracteres Mudam a Política",
    x: "Jack Dorsey envia 'just setting up my twttr'. Um serviço de microblog de 140 caracteres tornaria-se praça pública global, palco de revoluções, fábrica de celebridades, arma política e fonte primária de notícias em tempo real.",
    tg: ["internet", "cultura"], parents: ["facebook-2004"], importance: 4,
    img: "https://images.unsplash.com/photo-1611605698335-8b1569810432?w=1600&q=80",
    imgCredit: "Unsplash · Microblog", imgType: "contributed"
  },
  {
    id: "iphone-2007", y: 2007, m: 1, d: "JAN · 2007", era: "Era Mobile",
    track: "hardware",
    t: "O iPhone Reinventa Tudo",
    x: "Steve Jobs sobe ao palco de San Francisco: 'hoje a Apple vai reinventar o telefone'. Apresenta 'um iPod, um telefone, e um comunicador de internet' — um único dispositivo. O smartphone redefine para sempre como vivemos, trabalhamos e nos relacionamos.",
    tg: ["hardware", "mobile", "cultura"], parents: ["ipod-2001", "macintosh-1984"], importance: 5,
    img: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=1600&q=80",
    imgCredit: "Acervo · iPhone original", imgType: "contributed",
    quote: { text: "Today, Apple is going to reinvent the phone.", by: "Steve Jobs, Macworld 2007" },
    video: "x7qPAY9JqE4"
  },
  {
    id: "android-2008", y: 2008, m: 9, d: "SET · 2008", era: "Era Mobile",
    track: "software",
    t: "Android Chega ao Mundo",
    x: "O primeiro smartphone Android, o HTC Dream, é lançado. Open source, licenciado por qualquer fabricante. Em poucos anos, o Android rodaria em mais de 80% dos telefones do planeta — tornando-se o software mais usado da história humana.",
    tg: ["software", "mobile"], parents: ["iphone-2007", "linux-1991"], importance: 5,
    img: "https://images.unsplash.com/photo-1607252650355-f7fd0460ccdb?w=1600&q=80",
    imgCredit: "Unsplash · Android OS", imgType: "contributed"
  },
  {
    id: "bitcoin-2009", y: 2009, m: 1, d: "JAN · 2009", era: "Era da Nuvem",
    track: "software",
    t: "Bitcoin: Dinheiro Sem Governo",
    x: "Satoshi Nakamoto — pseudônimo até hoje sem identidade revelada — lança o Bitcoin. Dinheiro digital escasso, sem banco central, sem autoridade emissora. Redefine as conversas sobre moeda, poder e confiança para a década seguinte.",
    tg: ["software", "negócios", "cultura"], parents: ["tcp-1983"], importance: 4,
    img: "https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=1600&q=80",
    imgCredit: "Unsplash · Cryptocurrency", imgType: "contributed"
  },
  {
    id: "whatsapp-2009", y: 2009, m: 2, d: "FEV · 2009", era: "Era Mobile",
    track: "cultura",
    t: "WhatsApp: SMS Morre em Silêncio",
    x: "Jan Koum e Brian Acton, rejeitados pelo Facebook, fundam o WhatsApp. Um app simples: mensagens grátis via internet. Em 5 anos, o Facebook compraria a empresa por 19 bilhões de dólares — maior aquisição de sua história.",
    tg: ["mobile", "cultura", "internet"], parents: ["iphone-2007"], importance: 4,
    img: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=1600&q=80",
    imgCredit: "Unsplash · Messaging", imgType: "contributed"
  },
  {
    id: "instagram-2010", y: 2010, m: 10, d: "OUT · 2010", era: "Era Social",
    track: "cultura",
    t: "Instagram: A Estética Vira Linguagem",
    x: "Kevin Systrom e Mike Krieger lançam o Instagram. 25 mil usuários no primeiro dia. Filtros transformam fotos medianas em arte. Em uma década, redefiniria como vemos comida, viagem, corpo — e a própria realidade.",
    tg: ["mobile", "cultura"], parents: ["iphone-2007", "facebook-2004"], importance: 4,
    img: "https://images.unsplash.com/photo-1611162618071-b39a2ec055fb?w=1600&q=80",
    imgCredit: "Unsplash · Photography culture", imgType: "contributed"
  },
  {
    id: "alexnet-2012", y: 2012, m: 9, d: "SET · 2012", era: "Era da IA",
    track: "ia",
    t: "Deep Learning Acorda",
    x: "A rede neural AlexNet, de Alex Krizhevsky e Geoffrey Hinton, vence o desafio ImageNet com margem histórica usando GPUs. O campo de inteligência artificial, estagnado por décadas, é completamente reinventado. Começa aqui a corrida explosiva que levaria ao ChatGPT.",
    tg: ["ia", "ciência"], parents: ["perceptron-1958", "ic-1958"], importance: 5,
    img: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=1600&q=80",
    imgCredit: "Gerada por IA · Neural network", imgType: "ai"
  },
  {
    id: "alphago-2016", y: 2016, m: 3, d: "MAR · 2016", era: "Era da IA",
    track: "ia",
    t: "AlphaGo Derrota Lee Sedol",
    x: "A IA AlphaGo, da DeepMind, vence o campeão mundial de Go por 4 a 1. Go — com mais posições possíveis que átomos no universo observável — era considerado o santo graal dos jogos impossíveis para máquinas. A vitória dispara uma onda global de investimento em IA.",
    tg: ["ia", "cultura"], parents: ["alexnet-2012"], importance: 4,
    img: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1600&q=80",
    imgCredit: "Gerada por IA · Board game AI", imgType: "ai"
  },
  {
    id: "transformer-2017", y: 2017, m: 6, d: "JUN · 2017", era: "Era da IA",
    track: "ia",
    t: "A Arquitetura que Mudou Tudo",
    x: "Pesquisadores do Google publicam 'Attention is All You Need' e introduzem os Transformers. Uma arquitetura matemática única que processa sequências em paralelo. Toda IA generativa moderna — GPT, Claude, Gemini, LLaMA — nasce e evolui a partir deste único paper.",
    tg: ["ia", "software", "ciência"], parents: ["alexnet-2012"], importance: 5,
    img: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1600&q=80",
    imgCredit: "Gerada por IA · Attention mechanism", imgType: "ai",
    quote: { text: "Attention is all you need.", by: "Vaswani et al., Google Research, 2017" }
  },
  {
    id: "gpt3-2020", y: 2020, m: 6, d: "JUN · 2020", era: "Era da IA",
    track: "ia",
    t: "GPT-3: A IA Começa a Conversar",
    x: "OpenAI lança o GPT-3 — 175 bilhões de parâmetros, capaz de escrever código, poesia, ensaios, diálogos. Pela primeira vez, uma IA produzia texto que enganava leitores humanos. O terreno estava pronto para o momento ChatGPT.",
    tg: ["ia", "software"], parents: ["transformer-2017"], importance: 4,
    img: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=1600&q=80",
    imgCredit: "Gerada por IA · Language model", imgType: "ai"
  },
  {
    id: "tiktok-2018", y: 2018, m: 8, d: "AGO · 2018", era: "Era Social",
    track: "cultura",
    t: "TikTok Reescreve o Algoritmo do Mundo",
    x: "ByteDance lança o TikTok globalmente. O algoritmo 'For You' — baseado em comportamento, não em quem você segue — é tão viciante que Meta, YouTube e Twitter copiam a fórmula. A atenção humana vira o ativo mais disputado do planeta.",
    tg: ["mobile", "cultura", "ia"], parents: ["instagram-2010", "alexnet-2012"], importance: 4,
    img: "https://images.unsplash.com/photo-1611605698335-8b1569810432?w=1600&q=80",
    imgCredit: "Unsplash · Short video", imgType: "contributed"
  },
  {
    id: "chatgpt-2022", y: 2022, m: 11, d: "NOV · 2022", era: "Era Generativa",
    track: "ia",
    t: "A IA Conversa com o Mundo",
    x: "Em 30 de novembro, a OpenAI libera o ChatGPT ao público. Em 5 dias, 1 milhão de usuários. Em 2 meses, 100 milhões — o crescimento mais rápido de qualquer produto na história. A inteligência artificial deixa os laboratórios e entra no cotidiano global. Começa uma nova era.",
    tg: ["ia", "cultura"], parents: ["gpt3-2020", "transformer-2017"], importance: 5,
    img: "https://images.unsplash.com/photo-1696258686454-60082b2c79ee?w=1600&q=80",
    imgCredit: "Gerada por IA · Human-machine dialogue", imgType: "ai",
    quote: { text: "I think this will be the most important technology of the decade.", by: "Sam Altman, OpenAI" }
  },
  {
    id: "midjourney-2022", y: 2022, m: 7, d: "JUL · 2022", era: "Era Generativa",
    track: "ia",
    t: "A Imagem Deixa de Ser Prova",
    x: "Midjourney, DALL-E 2 e Stable Diffusion chegam ao público em semanas. Qualquer pessoa pode gerar imagens fotorrealistas a partir de texto. Séculos de 'ver para crer' terminam discretamente em um verão.",
    tg: ["ia", "cultura"], parents: ["transformer-2017"], importance: 4,
    img: "https://images.unsplash.com/photo-1707343844433-73d8006a81e5?w=1600&q=80",
    imgCredit: "Gerada por IA · Image synthesis", imgType: "ai"
  },
  {
    id: "claude-2023", y: 2023, m: 3, d: "MAR · 2023", era: "Era Generativa",
    track: "ia",
    t: "Claude: A IA que Raciocina com Segurança",
    x: "Anthropic lança o Claude — uma IA treinada com Constitutional AI, focada em ser útil, inofensiva e honesta. A empresa foi fundada por pesquisadores da OpenAI preocupados com o ritmo da corrida por capacidades sem garantias proporcionais de segurança.",
    tg: ["ia", "ciência"], parents: ["chatgpt-2022", "transformer-2017"], importance: 4,
    img: "https://images.unsplash.com/photo-1696258686454-60082b2c79ee?w=1600&q=80",
    imgCredit: "Gerada por IA · Constitutional AI", imgType: "ai"
  },
  {
    id: "vision-2024", y: 2024, m: 2, d: "FEV · 2024", era: "Era Generativa",
    track: "hardware",
    t: "Vision Pro: A Computação Espacial Chega",
    x: "Apple lança o Vision Pro — o primeiro headset mass-market a fundir realidade e digital de forma convincente. Muitos compararam ao momento iPhone de 2007. O futuro da computação pode não ter mais tela plana.",
    tg: ["hardware", "mobile", "cultura"], parents: ["iphone-2007"], importance: 3,
    img: "https://images.unsplash.com/photo-1593508512255-86ab42a8e620?w=1600&q=80",
    imgCredit: "Unsplash · Spatial computing", imgType: "contributed"
  },
  {
    id: "agents-2025", y: 2025, m: 6, d: "JUN · 2025", era: "Era Agêntica",
    track: "ia",
    t: "A Era dos Agentes Autônomos",
    x: "Claude, GPT e Gemini ganham capacidades agênticas — IAs que executam tarefas por múltiplos passos, usam ferramentas, navegam na web, escrevem código completo. Pela primeira vez, uma IA não apenas conversa: ela age.",
    tg: ["ia", "software"], parents: ["claude-2023", "chatgpt-2022"], importance: 5,
    img: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1600&q=80",
    imgCredit: "Gerada por IA · Autonomous agents", imgType: "ai"
  }
];

/* ════════════════════════════════════════════════════════════
   DEFINIÇÕES DE PISTAS (multi-track view)
   ════════════════════════════════════════════════════════════ */
const TRACKS = [
  { id: "hardware", label: "Hardware",    color: "#f4a261", icon: "▤" },
  { id: "software", label: "Software",    color: "#c084fc", icon: "◇" },
  { id: "ia",       label: "Inteligência Artificial", color: "#f472b6", icon: "✦" },
  { id: "rede",     label: "Redes & Internet", color: "#60a5fa", icon: "◉" },
  { id: "cultura",  label: "Cultura & Sociedade", color: "#5cc8b8", icon: "❖" }
];

/* ════════════════════════════════════════════════════════════
   CORES DAS TAGS
   ════════════════════════════════════════════════════════════ */
const TAG_COLORS = {
  "comunicação": "#5cc8b8",
  "hardware":    "#f4a261",
  "internet":    "#60a5fa",
  "software":    "#c084fc",
  "ia":          "#f472b6",
  "computação":  "#fbbf24",
  "negócios":    "#a3e635",
  "ciência":     "#38bdf8",
  "mobile":      "#fb923c",
  "cultura":     "#e879f9",
  "transporte":  "#94a3b8",
  "engenharia":  "#f87171"
};

/* ════════════════════════════════════════════════════════════
   TEMAS PLUGÁVEIS (roadmap: loading externo)
   ════════════════════════════════════════════════════════════ */
const THEMES = {
  "tech": {
    label: "História da Tecnologia",
    subtitle: "Explore os marcos que moldaram a era digital, de 1876 até hoje.",
    accent: "#5cc8b8"
  },
  "ia": {
    label: "A Corrida da IA",
    subtitle: "De Turing aos agentes autônomos — a jornada da inteligência artificial.",
    accent: "#f472b6",
    filter: (ev) => ev.track === "ia" || ev.tg.includes("ia")
  }
};