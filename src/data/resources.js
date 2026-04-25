export const sections = [
  {
    id: 'university',
    title: 'University Courses',
    icon: 'GraduationCap',
    resources: [
      {
        title: 'CS229 · Machine Learning',
        source: 'Stanford University · Andrew Ng',
        description: 'Supervised and unsupervised learning foundations with full lecture notes and assignments.',
        type: 'material',
        level: 'Advanced',
        tags: ['Stanford', 'Free'],
        meta: ['Lecture Notes', 'Advanced'],
        url: 'https://cs229.stanford.edu/'
      },
      {
        title: "CS50's Introduction to AI with Python",
        source: 'Harvard University',
        description: 'Popular Harvard course covering search, probability, neural networks, and ML with Python.',
        type: 'material',
        level: 'Beginner',
        tags: ['Harvard', 'Free'],
        meta: ['Hybrid', 'Beginner'],
        url: 'https://pll.harvard.edu/course/cs50s-introduction-artificial-intelligence-python'
      },
      {
        title: 'MIT OpenCourseWare · AI & ML',
        source: 'MIT',
        description: 'Large catalog of AI and ML classes, with full lecture notes, exams, and selected videos.',
        type: 'material',
        level: 'Intermediate',
        tags: ['MIT', 'Free'],
        meta: ['Notes + Video', 'Intermediate'],
        url: 'https://ocw.mit.edu/search/?q=artificial+intelligence'
      },
      {
        title: 'fast.ai · Practical Deep Learning for Coders',
        source: 'fast.ai',
        description: 'Top-rated free course covering deep learning hands-on: CV, NLP, tabular, and PyTorch. Endorsed by Peter Norvig. Recommended by multiple team members.',
        type: 'material',
        level: 'Beginner',
        tags: ['Fast.ai', 'Free', 'Team Pick'],
        meta: ['Video + Notebooks', 'Beginner'],
        url: 'https://course.fast.ai/'
      },
      {
        title: 'Neural Networks and Deep Learning',
        source: 'Michael Nielsen',
        description: 'Free online book providing deep intuition for neural networks and backpropagation. Highly recommended for building conceptual foundations.',
        type: 'material',
        level: 'Intermediate',
        tags: ['Book', 'Free', 'Team Pick'],
        meta: ['Book', 'Intermediate'],
        url: 'http://neuralnetworksanddeeplearning.com/'
      },
      {
        title: 'Deep Learning',
        source: 'Goodfellow, Bengio & Courville',
        description: 'The definitive deep learning textbook, available free online. Covers theory and math of modern DL systems.',
        type: 'material',
        level: 'Advanced',
        tags: ['Book', 'Free'],
        meta: ['Textbook', 'Advanced'],
        url: 'https://www.deeplearningbook.org/'
      },
      {
        title: 'Khan Academy · Math for AI',
        source: 'Khan Academy',
        description: 'Free math foundations essential for AI: linear algebra, probability, statistics, and calculus. Great prerequisite resource before diving into ML courses.',
        type: 'material',
        level: 'Beginner',
        tags: ['Math', 'Free'],
        meta: ['Interactive', 'Beginner'],
        url: 'https://www.khanacademy.org/math'
      }
    ]
  },
  {
    id: 'industry',
    title: 'Industry & Labs',
    icon: 'Building2',
    resources: [
      {
        title: 'DeepLearning.AI Short Courses',
        source: 'DeepLearning.AI',
        description: 'Hands-on AI courses on prompting, RAG, agents, and production LLM development.',
        type: 'material',
        level: 'Beginner',
        tags: ['Industry', 'Free'],
        meta: ['Practical', 'Beginner'],
        url: 'https://www.deeplearning.ai/short-courses/'
      },
      {
        title: 'Hugging Face Course',
        source: 'Hugging Face',
        description: 'Transformer fundamentals, model training, deployment, and open-source tooling tutorials.',
        type: 'material',
        level: 'Intermediate',
        tags: ['Industry', 'Free'],
        meta: ['Docs + Labs', 'Intermediate'],
        url: 'https://huggingface.co/learn'
      },
      {
        title: 'Anthropic Prompt Engineering Guide',
        source: 'Anthropic',
        description: 'Official best practices for building robust prompts and safe assistant experiences.',
        type: 'material',
        level: 'Intermediate',
        tags: ['Anthropic', 'Free'],
        meta: ['Guide', 'Intermediate'],
        url: 'https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview'
      },
      {
        title: 'Google ML Crash Course',
        source: 'Google',
        description: "Google's free introductory machine learning course using TensorFlow. Covers ML concepts, regression, classification, and neural networks.",
        type: 'material',
        level: 'Beginner',
        tags: ['Google', 'Free'],
        meta: ['Course', 'Beginner'],
        url: 'https://developers.google.com/machine-learning/crash-course/'
      },
      {
        title: 'LangChain Academy',
        source: 'LangChain',
        description: 'Free courses on building agentic AI systems with LangGraph, including Introduction to LangGraph. Recommended by team for anyone exploring AI agents.',
        type: 'material',
        level: 'Intermediate',
        tags: ['Agents', 'Free', 'Team Pick'],
        meta: ['Course', 'Intermediate'],
        url: 'https://academy.langchain.com/'
      },
      {
        title: 'Full Stack Deep Learning',
        source: 'Full Stack Deep Learning',
        description: 'Covers the full ML lifecycle: data, training, deployment, and MLOps. Practical focus on production-ready deep learning systems.',
        type: 'material',
        level: 'Advanced',
        tags: ['MLOps', 'Free'],
        meta: ['Course', 'Advanced'],
        url: 'https://fullstackdeeplearning.com/course/2022/'
      },
      {
        title: 'OpenAI Agents SDK Quickstart',
        source: 'OpenAI',
        description: 'Official quickstart guide for building AI agents with the OpenAI Agents SDK. Covers tools, handoffs, and multi-agent patterns.',
        type: 'material',
        level: 'Intermediate',
        tags: ['Agents', 'OpenAI', 'Free'],
        meta: ['Guide', 'Intermediate'],
        url: 'https://openai.github.io/openai-agents-python/quickstart/'
      },
      {
        title: 'Coursera AI & ML Courses',
        source: 'Coursera',
        description: 'University-level AI and ML courses from Stanford, DeepLearning.AI, Google, and others. Strong for structured learning paths and recognized certificates.',
        type: 'material',
        level: 'Beginner',
        tags: ['University', 'Certificates'],
        meta: ['Course Platform', 'Beginner'],
        url: 'https://www.coursera.org/search?query=machine+learning'
      },
      {
        title: 'Microsoft Learn · AI',
        source: 'Microsoft',
        description: 'Free structured learning paths for AI fundamentals, Azure AI services, and practical AI engineering. Includes hands-on labs and certifications.',
        type: 'material',
        level: 'Beginner',
        tags: ['Microsoft', 'Free', 'Certificates'],
        meta: ['Learning Path', 'Beginner'],
        url: 'https://learn.microsoft.com/en-us/training/browse/?products=ai-services'
      },
      {
        title: 'Papers With Code',
        source: 'Papers With Code',
        description: 'Tracks state-of-the-art AI research with linked code implementations and benchmarks. Best place to connect research papers to working code.',
        type: 'material',
        level: 'Advanced',
        tags: ['Research', 'Free'],
        meta: ['Research Hub', 'Advanced'],
        url: 'https://paperswithcode.com/'
      },
      {
        title: 'OpenAI Cookbook',
        source: 'OpenAI',
        description: 'Real-world examples for building with OpenAI APIs: prompting patterns, RAG, embeddings, fine-tuning, and agentic workflows. Practical and frequently updated.',
        type: 'material',
        level: 'Intermediate',
        tags: ['OpenAI', 'Free', 'Practical'],
        meta: ['Examples', 'Intermediate'],
        url: 'https://cookbook.openai.com/'
      },
      {
        title: 'Learn Prompting',
        source: 'Learn Prompting',
        description: 'Free, comprehensive guide to prompt engineering: zero-shot, few-shot, chain-of-thought, and advanced techniques for getting the best out of LLMs.',
        type: 'material',
        level: 'Beginner',
        tags: ['Prompting', 'Free'],
        meta: ['Guide', 'Beginner'],
        url: 'https://learnprompting.org/'
      },
      {
        title: 'ArXiv · AI & ML',
        source: 'ArXiv',
        description: 'The primary preprint server for cutting-edge AI and ML research papers. Essential for tracking state-of-the-art developments before they appear in journals.',
        type: 'material',
        level: 'Advanced',
        tags: ['Research', 'Free'],
        meta: ['Papers', 'Advanced'],
        url: 'https://arxiv.org/list/cs.AI/recent'
      },
      {
        title: 'Awesome Machine Learning',
        source: 'GitHub · josephmisiti',
        description: 'Massive curated GitHub list of ML frameworks, libraries, datasets, and resources organized by language and topic. A comprehensive index for any ML need.',
        type: 'material',
        level: 'Beginner',
        tags: ['Directory', 'Free', 'Open Source'],
        meta: ['Curated List', 'All Levels'],
        url: 'https://github.com/josephmisiti/awesome-machine-learning'
      }
    ]
  },
  {
    id: 'videos',
    title: 'Video Channels',
    icon: 'Play',
    resources: [
      {
        title: 'Andrej Karpathy YouTube',
        source: 'Andrej Karpathy',
        description: 'In-depth AI lessons from fundamentals to modern LLM internals and implementation details.',
        type: 'video',
        level: 'Intermediate',
        tags: ['Video', 'Free'],
        meta: ['YouTube', 'Intermediate'],
        url: 'https://www.youtube.com/@AndrejKarpathy'
      },
      {
        title: 'Stanford CS25 Transformers United',
        source: 'Stanford Online',
        description: 'Lecture series focused on transformer architecture and practical applications.',
        type: 'video',
        level: 'Advanced',
        tags: ['Stanford', 'Free'],
        meta: ['Lecture Series', 'Advanced'],
        url: 'https://www.youtube.com/playlist?list=PLoROMvodv4rNiJRchCzutFw5ItR_Z27CM'
      },
      {
        title: 'freeCodeCamp AI Playlist',
        source: 'freeCodeCamp',
        description: 'Long-form tutorials on ML, deep learning, LLMs, and MLOps for beginners.',
        type: 'video',
        level: 'Beginner',
        tags: ['Video', 'Free'],
        meta: ['YouTube', 'Beginner'],
        url: 'https://www.youtube.com/@freecodecamp'
      },
      {
        title: 'ML Zoomcamp',
        source: 'DataTalks.Club',
        description: 'Free ML engineering course in video format covering regression, classification, deployment, and more. Cohort-based with community support.',
        type: 'video',
        level: 'Beginner',
        tags: ['Video', 'Free', 'Team Pick'],
        meta: ['YouTube', 'Beginner'],
        url: 'https://www.youtube.com/watch?v=MqI8vt3-cag&list=PL3MmuxUbc_hL5QBBEyKUXKuTNx-3cTpKs'
      },
      {
        title: 'ML YouTube Courses (dair-ai)',
        source: 'dair-ai · GitHub',
        description: 'Curated directory of the best free ML and AI YouTube courses: Karpathy, CMU, CS229, NLP, CV, and RL tracks. A great starting point for any topic.',
        type: 'material',
        level: 'Beginner',
        tags: ['Directory', 'Free'],
        meta: ['Curated List', 'All Levels'],
        url: 'https://github.com/dair-ai/ML-YouTube-Courses'
      },
      {
        title: '3Blue1Brown · Neural Networks',
        source: '3Blue1Brown',
        description: 'Iconic visual explainers for neural networks, backpropagation, and linear algebra. The clearest and most beautiful introduction to the math behind deep learning.',
        type: 'video',
        level: 'Beginner',
        tags: ['Video', 'Free', 'Math'],
        meta: ['YouTube', 'Beginner'],
        url: 'https://www.youtube.com/@3blue1brown'
      },
      {
        title: 'Yannic Kilcher',
        source: 'Yannic Kilcher',
        description: 'Deep paper-by-paper reviews of top AI research (GPT, RLHF, diffusion models, and more). Highly popular with practitioners who want to understand the research behind modern AI.',
        type: 'video',
        level: 'Advanced',
        tags: ['Video', 'Free', 'Research'],
        meta: ['YouTube', 'Advanced'],
        url: 'https://www.youtube.com/@YannicKilcher'
      },
      {
        title: 'Two Minute Papers',
        source: 'Two Minute Papers',
        description: 'Accessible summaries of the latest AI and ML research papers. Great for staying current on breakthroughs without reading full papers.',
        type: 'video',
        level: 'Intermediate',
        tags: ['Video', 'Free', 'Research'],
        meta: ['YouTube', 'Intermediate'],
        url: 'https://www.youtube.com/@TwoMinutePapers'
      },
      {
        title: 'Lex Fridman Podcast',
        source: 'Lex Fridman',
        description: 'Long-form interviews with leading AI researchers and practitioners including Hinton, LeCun, Karpathy, and Sutskever. Excellent for understanding the people and ideas shaping AI.',
        type: 'video',
        level: 'Intermediate',
        tags: ['Video', 'Free', 'Interviews'],
        meta: ['YouTube', 'All Levels'],
        url: 'https://www.youtube.com/@lexfridman'
      },
      {
        title: 'Sentdex',
        source: 'Sentdex',
        description: 'Practical Python tutorials for ML, NLP, and AI — with a focus on building real projects. Great for hands-on learners who want to write code from day one.',
        type: 'video',
        level: 'Beginner',
        tags: ['Video', 'Free', 'Python'],
        meta: ['YouTube', 'Beginner'],
        url: 'https://www.youtube.com/@sentdex'
      },
      {
        title: 'Stanford CS231n · Computer Vision',
        source: 'Stanford University',
        description: 'Stanford\'s definitive deep learning for computer vision course. Covers CNNs, object detection, segmentation, and visual recognition in depth.',
        type: 'video',
        level: 'Advanced',
        tags: ['Stanford', 'Free', 'Computer Vision'],
        meta: ['Lecture Series', 'Advanced'],
        url: 'https://www.youtube.com/playlist?list=PL3FW7Lu3i5JvHM8ljYj-zLfQRF3EO8sYv'
      },
      {
        title: 'MIT 6.S191 · Introduction to Deep Learning',
        source: 'MIT',
        description: 'MIT\'s annual deep learning bootcamp. Covers foundations of deep learning, CNNs, RNNs, generative models, and reinforcement learning in a compact format.',
        type: 'video',
        level: 'Intermediate',
        tags: ['MIT', 'Free'],
        meta: ['Lecture Series', 'Intermediate'],
        url: 'https://www.youtube.com/playlist?list=PLtBw6njQRU-rwp5__7C0oIVt26ZgjG9NI'
      },
      {
        title: 'Neural Networks: Zero to Hero',
        source: 'Andrej Karpathy',
        description: 'Karpathy\'s structured course playlist — builds neural networks from scratch in pure Python/PyTorch. Widely considered one of the best technical deep learning courses available.',
        type: 'video',
        level: 'Intermediate',
        tags: ['Video', 'Free', 'Team Pick'],
        meta: ['YouTube Playlist', 'Intermediate'],
        url: 'https://www.youtube.com/playlist?list=PLAqhIrjkxbuWI23v9cThsA9GvCAUhRvKZ'
      },
      {
        title: 'AI Explained',
        source: 'AI Explained',
        description: 'Clear, accessible explainers on the latest LLM and GenAI developments — capabilities, benchmarks, and implications. Ideal for non-technical audiences and product thinkers.',
        type: 'video',
        level: 'Beginner',
        tags: ['Video', 'Free', 'GenAI'],
        meta: ['YouTube', 'Beginner'],
        url: 'https://www.youtube.com/@aiexplained-official'
      },
      {
        title: 'DeepMind · Reinforcement Learning',
        source: 'UCL & DeepMind',
        description: 'UCL and DeepMind\'s joint RL lecture series — covers the theory and practice of reinforcement learning from foundations to modern deep RL methods.',
        type: 'video',
        level: 'Advanced',
        tags: ['Video', 'Free', 'Reinforcement Learning'],
        meta: ['Lecture Series', 'Advanced'],
        url: 'https://www.youtube.com/playlist?list=PLqYmG7hTraZDVH599EItlEWsUOsJbAodm'
      }
    ]
  },
  {
    id: 'tooling',
    title: 'AI Tooling',
    icon: 'Wrench',
    resources: [
      {
        title: 'ChatGPT',
        source: 'OpenAI',
        description: 'General-purpose AI assistant for writing, coding, research, and idea exploration.',
        type: 'tool',
        level: 'Beginner',
        tags: ['Assistant', 'Free Tier'],
        meta: ['Assistant', 'All Levels'],
        url: 'https://chatgpt.com/'
      },
      {
        title: 'Perplexity',
        source: 'Perplexity AI',
        description: 'Research assistant that combines web search with citation-backed AI responses.',
        type: 'tool',
        level: 'Beginner',
        tags: ['Research', 'Free Tier'],
        meta: ['Search', 'Beginner'],
        url: 'https://www.perplexity.ai/'
      },
      {
        title: 'n8n',
        source: 'n8n',
        description: 'Automation platform to build AI workflows, data pipelines, and agent-based processes.',
        type: 'tool',
        level: 'Intermediate',
        tags: ['Automation', 'Open Source'],
        meta: ['Automation', 'Intermediate'],
        url: 'https://n8n.io/'
      },
      {
        title: 'NotebookLM',
        source: 'Google',
        description: 'AI-powered research assistant that lets you upload sources (PDFs, docs, URLs) and ask questions grounded in your own materials.',
        type: 'tool',
        level: 'Beginner',
        tags: ['Research', 'Free'],
        meta: ['Research Tool', 'Beginner'],
        url: 'https://notebooklm.google/'
      },
      {
        title: 'CrewAI',
        source: 'CrewAI',
        description: 'Framework for building multi-agent AI systems. Define roles, goals, and tasks for crews of AI agents that collaborate to complete complex workflows.',
        type: 'tool',
        level: 'Intermediate',
        tags: ['Agents', 'Open Source', 'Team Pick'],
        meta: ['Framework', 'Intermediate'],
        url: 'https://docs.crewai.com/en/quickstart'
      },
      {
        title: 'Agent Skills',
        source: 'agentskills.io',
        description: 'Open standard for extending AI coding agents with reusable skills. Browse the spec, find compatible tools (Cursor, Claude Code, OpenCode, Copilot, and more), and build portable agent workflows.',
        type: 'tool',
        level: 'Intermediate',
        tags: ['Agents', 'Open Source', 'Open Standard'],
        meta: ['Ecosystem', 'Intermediate'],
        url: 'https://agentskills.io/home'
      },
      {
        title: 'Kaggle',
        source: 'Kaggle · Google',
        description: 'Best platform for hands-on ML practice: datasets, notebooks, competitions, and free courses. Essential for building real-world ML skills through doing.',
        type: 'tool',
        level: 'Beginner',
        tags: ['Practice', 'Free', 'Competitions'],
        meta: ['Platform', 'All Levels'],
        url: 'https://www.kaggle.com/'
      },
      {
        title: 'LlamaIndex',
        source: 'LlamaIndex',
        description: 'Framework for building RAG (Retrieval-Augmented Generation) systems and knowledge retrieval pipelines with LLMs. Key tool for production AI systems.',
        type: 'tool',
        level: 'Intermediate',
        tags: ['RAG', 'Agents', 'Open Source'],
        meta: ['Framework', 'Intermediate'],
        url: 'https://www.llamaindex.ai/'
      },
      {
        title: 'Weights & Biases',
        source: 'Weights & Biases',
        description: 'ML experiment tracking, model versioning, and production ML monitoring. Industry-standard platform for managing the full ML development lifecycle.',
        type: 'tool',
        level: 'Intermediate',
        tags: ['MLOps', 'Free Tier'],
        meta: ['MLOps Platform', 'Intermediate'],
        url: 'https://wandb.ai/'
      },
      {
        title: 'Google AI Studio',
        source: 'Google',
        description: 'Free browser-based IDE for prototyping with Gemini and other Google multimodal models. Great for rapid experimentation with prompts, images, and code.',
        type: 'tool',
        level: 'Beginner',
        tags: ['Google', 'Free', 'Prototyping'],
        meta: ['Dev Tool', 'Beginner'],
        url: 'https://aistudio.google.com/'
      },
      {
        title: 'Replit AI',
        source: 'Replit',
        description: 'AI-assisted coding environment in the browser. Good for building, debugging, and deploying small projects without local setup.',
        type: 'tool',
        level: 'Beginner',
        tags: ['Coding', 'Free Tier'],
        meta: ['Dev Tool', 'Beginner'],
        url: 'https://replit.com/'
      },
      {
        title: 'Gamma',
        source: 'Gamma',
        description: 'AI-powered presentation and document creator. Generates structured slides and docs from a prompt — useful for rapid content and deck creation.',
        type: 'tool',
        level: 'Beginner',
        tags: ['Productivity', 'Free Tier'],
        meta: ['Productivity', 'Beginner'],
        url: 'https://gamma.app/'
      },
      {
        title: 'ElevenLabs',
        source: 'ElevenLabs',
        description: 'High-quality realistic text-to-speech and voice cloning. Industry-leading audio generation for voiceovers, narration, and AI voice applications.',
        type: 'tool',
        level: 'Beginner',
        tags: ['Audio', 'Free Tier'],
        meta: ['Creative AI', 'Beginner'],
        url: 'https://elevenlabs.io/'
      },
      {
        title: 'Leonardo.ai',
        source: 'Leonardo.ai',
        description: 'High-quality AI image generation with fine-tuned models. Suited for creative, marketing, and social media visuals with a generous free tier.',
        type: 'tool',
        level: 'Beginner',
        tags: ['Image Gen', 'Free Tier'],
        meta: ['Creative AI', 'Beginner'],
        url: 'https://leonardo.ai/'
      },
      {
        title: 'Suno AI',
        source: 'Suno',
        description: 'Generates full songs with vocals and instrumentation from text prompts. One of the most capable free AI music generation tools available.',
        type: 'tool',
        level: 'Beginner',
        tags: ['Music', 'Free Tier'],
        meta: ['Creative AI', 'Beginner'],
        url: 'https://suno.com/'
      },
      {
        title: 'Ideogram',
        source: 'Ideogram',
        description: 'AI image generation with accurate text rendering inside images — solving one of the hardest problems in image gen. Good for graphics with legible text.',
        type: 'tool',
        level: 'Beginner',
        tags: ['Image Gen', 'Free Tier'],
        meta: ['Creative AI', 'Beginner'],
        url: 'https://ideogram.ai/'
      },
      {
        title: 'Taskade',
        source: 'Taskade',
        description: 'AI-powered project planning with checklists, mind maps, and automated workflows. Useful for teams building AI-assisted operational processes.',
        type: 'tool',
        level: 'Beginner',
        tags: ['Productivity', 'Free Tier'],
        meta: ['Productivity', 'Beginner'],
        url: 'https://www.taskade.com/'
      }
    ]
  }
];
