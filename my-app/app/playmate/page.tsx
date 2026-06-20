"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import Navbar from "@/components/navbar";
import { ADMIN_DISCORD_IDS } from "@/app/lib/auth";
import { signIn, useSession } from "next-auth/react";

type RankOption = {
  key?: string;
  name: string;
  price: number;
  description?: string;
};

type Playmate = {
  id: number;
  name: string;
  game: string;
  price: number;
  role: PlaymateRole;
  description: string;
  image?: string | null;
  ranks?: RankOption[];
};

type PlaymateRole = "技术陪玩" | "娱乐陪玩" | "段位";

type FormState = {
  name: string;
  game: string;
  price: string;
  role: PlaymateRole;
  description: string;
  image: string;
  ranks: RankOption[];
  newRankName: string;
  newRankPrice: string;
  newRankDescription: string;
};

type GameCard = {
  name: string;
  image: string;
};

type ServiceMode = "娱乐陪" | "技术陪";
type GenderPreference = "随机" | "男生" | "女生";

type QuickOrderState = {
  game: string;
  mode: ServiceMode;
  playmateId: string;
  gender: GenderPreference;
  minutes: number;
  startTime: string;
  note: string;
  rankKey: string;
};

type OrderStage = "填写订单" | "接单大厅" | "老板选择" | "付款" | "服务中" | "订单结束";

type Applicant = {
  id: number;
  avatar: string;
  nickname: string;
  gender: string;
  age: number;
  rank: string;
  tags: ServiceMode[];
  intro: string;
  rating: number;
  completedOrders: number;
};

type ApiResponse<T = Record<string, unknown>> = T & {
  error?: string;
};

const initialFormState: FormState = {
  name: "",
  game: "",
  price: "",
  role: "娱乐陪玩",
  description: "",
  image: "",
  ranks: [],
  newRankName: "",
  newRankPrice: "",
  newRankDescription: "",
};

const initialQuickOrder: QuickOrderState = {
  game: "Valorant",
  mode: "娱乐陪",
  playmateId: "random",
  gender: "随机",
  minutes: 30,
  startTime: "",
  note: "",
  rankKey: "",
};

const serviceCategories = ["代肝", "陪聊", "唱歌", "语音聊天"];

const gameCards: GameCard[] = [
  {
    name: "Valorant",
    image: "/image/Valorant.jpg",
  },
  {
    name: "League of Legends",
    image: "/image/League%20of%20Legends.jpg",
  },
  {
    name: "CS2",
    image: "/image/CS2.jfif",
  },
  {
    name: "Apex Legends",
    image: "/image/Apex.jpg",
  },
  { name: "Steam 其他游戲", image: "/image/steam照片.jpg" },
  { name: "代肝", image: "/image/代肝.png" },
  { name: "陪聊", image: "/image/陪聊.png" },
  { name: "唱歌", image: "/image/唱歌.png" },
  { name: "语音聊天", image: "/image/打字陪伴.png" },
];

const gameOptions = ["Valorant", "CS2", "League of Legends", "Apex Legends", "Steam 其他游戲", ...serviceCategories];
const genderOptions: GenderPreference[] = ["随机", "男生", "女生"];
const playmateRoleOptions: PlaymateRole[] = ["娱乐陪玩", "技术陪玩", "段位"];

const applicants: Applicant[] = [
  {
    id: 1,
    avatar: "/uploads/bc34f10b-41b2-4e5b-98a1-c43a2f5d343d.png",
    nickname: "Mika",
    gender: "女生",
    age: 22,
    rank: "Valorant 钻石",
    tags: ["娱乐陪", "技术陪"],
    intro: "主打轻松沟通和稳定补位，可以娱乐聊天，也能认真上分。",
    rating: 4.9,
    completedOrders: 186,
  },
  {
    id: 2,
    avatar: "/uploads/b9501a4a-65e2-4b51-bf12-84f94829110c.png",
    nickname: "Kiro",
    gender: "男生",
    age: 24,
    rank: "CS2 Premier 18K",
    tags: ["技术陪"],
    intro: "擅长复盘、指挥和枪线教学，适合需要提升细节的老板。",
    rating: 4.8,
    completedOrders: 143,
  },
  {
    id: 3,
    avatar: "/uploads/9af379ef-c41c-49a3-a7f8-5fed49bc8f38.png",
    nickname: "Yuki",
    gender: "女生",
    age: 21,
    rank: "LoL 翡翠",
    tags: ["娱乐陪"],
    intro: "气氛组，主打不冷场、好沟通，适合休闲局和聊天局。",
    rating: 4.95,
    completedOrders: 221,
  },
];

const mainGames = gameCards
  .filter((game) => game.name !== "Other Games")
  .map((game) => game.name.toLowerCase());

const primaryButton =
  "rounded-lg bg-white px-5 py-3 text-sm font-bold text-black transition duration-200 hover:-translate-y-0.5 hover:bg-cyan-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60";

const darkButton =
  "rounded-lg border border-zinc-700 bg-black px-5 py-3 text-sm font-semibold text-white transition duration-200 hover:-translate-y-0.5 hover:border-cyan-300 hover:text-cyan-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60";

const fieldClass =
  "min-h-11 rounded-lg border border-zinc-700 bg-black px-4 text-white outline-none transition placeholder:text-zinc-500 focus:border-cyan-300";

const getQuickOrderPrice = (order: QuickOrderState, selectedRankPrice: number | null) => {
  const startDate = order.startTime ? new Date(order.startTime) : null;
  const startHour = startDate?.getHours() ?? 0;
  const startMinute = startDate?.getMinutes() ?? 0;
  const nightFee = startHour > 23 || (startHour === 23 && startMinute >= 30) ? 5 : 0;
  const basePrice =
    order.mode === "技术陪"
      ? selectedRankPrice !== null
        ? Math.max(1, Math.ceil(selectedRankPrice * Math.max(1, Math.ceil(order.minutes / 30))))
        : 0
      : 25 * (order.minutes / 60);

  return {
    hourlyPrice: order.mode === "娱乐陪" ? 25 : selectedRankPrice ?? 45,
    basePrice,
    nightFee,
    total: basePrice + nightFee,
    isNightOrder: nightFee > 0,
  };
};

const getPlaymateOrderCoins = (playmate: Playmate, minutes: number) =>
  playmate.role === "技术陪玩" || playmate.role === "段位"
    ? Math.max(1, Math.ceil(playmate.price * Math.max(1, Math.ceil(minutes / 30))))
    : Math.max(1, Math.ceil(playmate.price * (minutes / 60)));

const getPlaymateUnitLabel = (playmate: Pick<Playmate, "role">) =>
  playmate.role === "技术陪玩" ? "局" : "小时";

const getLateFee = (dateTime: string) => {
  if (!dateTime) {
    return 0;
  }

  const date = new Date(dateTime);
  const hour = date.getHours();
  const minute = date.getMinutes();

  return hour > 23 || (hour === 23 && minute >= 30) ? 5 : 0;
};

const getOvertimeFee = (minutes: number) => {
  if (minutes < 15) {
    return 0;
  }

  return Math.ceil(minutes / 60 / 0.5) * 12.5;
};

const isValidImageSrc = (src?: string | null) => {
  if (!src) {
    return false;
  }

  return src.startsWith("/") || src.startsWith("http://") || src.startsWith("https://");
};

const readJson = async <T,>(res: Response): Promise<T | null> => {
  const text = await res.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
};

const loadPlaymates = async () => {
  const res = await fetch("/api/playmates", { cache: "no-store" });
  const data = await readJson<Playmate[]>(res);

  if (!res.ok) {
    return [];
  }

  return Array.isArray(data) ? data : [];
};

export default function PlaymatePage() {
  const { data: session, status } = useSession();
  const [playmates, setPlaymates] = useState<Playmate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedGame, setSelectedGame] = useState("");
  const [form, setForm] = useState<FormState>(initialFormState);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [modalMessage, setModalMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [bookingPlaymate, setBookingPlaymate] = useState<Playmate | null>(null);
  const [bookingTime, setBookingTime] = useState("");
  const [bookingDuration, setBookingDuration] = useState(30);
  const showBookings = false;
  const [bookingMessage, setBookingMessage] = useState<string | null>(null);
  const [isBooking, setIsBooking] = useState(false);
  const [quickOrder, setQuickOrder] = useState<QuickOrderState>(initialQuickOrder);
  const [orderStage, setOrderStage] = useState<OrderStage>("填写订单");
  const [quickOrderMessage, setQuickOrderMessage] = useState<string | null>(null);
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  const [quickOrderCandidates, setQuickOrderCandidates] = useState<Playmate[]>([]);
  const [selectedQuickPlaymate, setSelectedQuickPlaymate] = useState<Playmate | null>(null);
  const [coinBalance, setCoinBalance] = useState(0);
  const [overtimeMinutes, setOvertimeMinutes] = useState(0);
  const [shopRating, setShopRating] = useState(5);
  const [playmateRating, setPlaymateRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [proofUploaded, setProofUploaded] = useState(false);
  const isAdmin = Boolean(
    session?.user?.discordId && ADMIN_DISCORD_IDS.includes(session.user.discordId),
  );

  const rankOptions = useMemo(() => {
    const ranks = playmates.flatMap((playmate) => playmate.ranks ?? []);
    const uniqueRanks: Record<string, RankOption> = {};
    for (const rank of ranks) {
      const key = `${rank.name}__${rank.price}__${rank.description ?? ""}`;
      if (!uniqueRanks[key]) {
        uniqueRanks[key] = { ...rank, key };
      }
    }
    return Object.values(uniqueRanks).sort((a, b) => a.price - b.price || a.name.localeCompare(b.name));
  }, [playmates]);

  const selectedRankPrice = useMemo(() => {
    const selectedRank = rankOptions.find((rank) => rank.key === quickOrder.rankKey);
    return selectedRank ? selectedRank.price : null;
  }, [quickOrder.rankKey, rankOptions]);

  const quickOrderPrice = useMemo(
    () => getQuickOrderPrice(quickOrder, selectedRankPrice),
    [quickOrder, selectedRankPrice],
  );
  const filteredApplicants = useMemo(
    () =>
      applicants.filter(
        (applicant) =>
          applicant.tags.includes(quickOrder.mode) &&
          (quickOrder.game === "其他游戏" ||
            applicant.rank.toLowerCase().includes(quickOrder.game.toLowerCase()) ||
            quickOrder.mode === "娱乐陪"),
      ),
    [quickOrder.game, quickOrder.mode],
  );
  const overtimeFee = useMemo(() => getOvertimeFee(overtimeMinutes), [overtimeMinutes]);


  const quickOrderCost = useMemo(() => {
    if (quickOrder.mode === "技术陪" && selectedRankPrice !== null) {
      return Math.max(1, Math.ceil(selectedRankPrice * Math.max(1, Math.ceil(quickOrder.minutes / 30)))) + getLateFee(quickOrder.startTime);
    }

    return selectedQuickPlaymate
      ? getPlaymateOrderCoins(selectedQuickPlaymate, quickOrder.minutes) + getLateFee(quickOrder.startTime)
      : Math.ceil(quickOrderPrice.total);
  }, [quickOrder.mode, quickOrder.minutes, quickOrder.startTime, quickOrderPrice.total, selectedQuickPlaymate, selectedRankPrice]);
  const bookingCost = useMemo(
    () => (bookingPlaymate ? getPlaymateOrderCoins(bookingPlaymate, bookingDuration) + getLateFee(bookingTime) : 0),
    [bookingDuration, bookingPlaymate, bookingTime],
  );

  const fetchPlaymates = useCallback(async () => {
    setIsLoading(true);
    setPlaymates(await loadPlaymates());
    setIsLoading(false);
  }, []);

  useEffect(() => {
    let isMounted = true;

    void loadPlaymates().then((data) => {
      if (!isMounted) {
        return;
      }

      setPlaymates(data);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const syncCoins = async () => {
      if (status !== "authenticated") {
        setCoinBalance(0);
        return;
      }

      const res = await fetch("/api/wallet", { cache: "no-store" });
      const data = await readJson<ApiResponse<{ coinBalance?: number }>>(res);

      if (res.ok && data) {
        setCoinBalance(Number(data.coinBalance ?? 0));
      }
    };

    void syncCoins();
    window.addEventListener("ee-coins-updated", syncCoins);

    return () => {
      window.removeEventListener("ee-coins-updated", syncCoins);
    };
  }, [status]);

  const filteredPlaymates = useMemo(() => {
    const query = search.trim().toLowerCase();

    return playmates.filter((playmate) => {
      const game = playmate.game.toLowerCase();
      const matchesSearch =
        !query ||
        playmate.name.toLowerCase().includes(query) ||
        game.includes(query) ||
        playmate.description.toLowerCase().includes(query);

      const matchesGame =
        !selectedGame ||
        (selectedGame === "Other Games"
          ? !mainGames.includes(game)
          : game.includes(selectedGame.toLowerCase()));

      return matchesSearch && matchesGame;
    });
  }, [playmates, search, selectedGame]);

  const handleChange = <Key extends keyof FormState>(field: Key, value: FormState[Key]) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
      ...(field === "role" && value !== "段位"
        ? { ranks: [], newRankName: "", newRankPrice: "", newRankDescription: "" }
        : {}),
    }));
  };

  const openCreateModal = () => {
    if (!isAdmin) {
      setMessage("只有管理员可以新增陪玩。");
      return;
    }

    setEditingId(null);
    setForm(initialFormState);
    setModalMessage(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setEditingId(null);
    setForm(initialFormState);
    setModalMessage(null);
    setIsModalOpen(false);
  };

  const openBookingModal = (playmate: Playmate) => {
    if (status !== "authenticated") {
      void signIn("discord", { callbackUrl: "/playmate" });
      return;
    }

    setBookingPlaymate(playmate);
    setBookingTime("");
    setBookingDuration(30);
    setBookingMessage(null);
  };

  const updateQuickOrder = <Key extends keyof QuickOrderState>(
    field: Key,
    value: QuickOrderState[Key],
  ) => {
    setQuickOrder((prev) => ({
      ...prev,
      [field]: value,
      ...(field === "mode" && value !== "技术陪" ? { rankKey: "" } : {}),
    }));
  };

  const submitQuickOrder = () => {
    if (status !== "authenticated") {
      void signIn("discord", { callbackUrl: "/playmate" });
      return;
    }

    if (!quickOrder.game || !quickOrder.minutes || !quickOrder.startTime) {
      setQuickOrderMessage("请先填写游戏、分钟和开始时间。");
      return;
    }

    if (quickOrder.mode === "技术陪" && !quickOrder.rankKey) {
      setQuickOrderMessage("请选择段位价格后继续下单。");
      return;
    }

    if (quickOrder.minutes < 30) {
      setQuickOrderMessage("服务时长至少 30 分钟。");
      return;
    }

    const startDate = new Date(quickOrder.startTime);
    if (Number.isNaN(startDate.getTime()) || startDate <= new Date()) {
      setQuickOrderMessage("开始时间必须是未来时间。");
      return;
    }

    const candidates = playmates.filter((playmate) => {
      const matchesPlaymate =
        quickOrder.playmateId === "random" || playmate.id === Number(quickOrder.playmateId);
      const matchesGame =
        quickOrder.game === "其他游戏" ||
        playmate.game.toLowerCase().includes(quickOrder.game.toLowerCase());
      const matchesMode =
        (quickOrder.mode === "技术陪" && playmate.role === "技术陪玩") ||
        (quickOrder.mode === "娱乐陪" && playmate.role === "娱乐陪玩");
      const profileText = `${playmate.name} ${playmate.description}`.toLowerCase();
      const matchesGender =
        quickOrder.gender === "随机" ||
        profileText.includes(quickOrder.gender === "女生" ? "女" : "男");

      return matchesPlaymate && matchesGame && matchesMode && matchesGender;
    });

    if (candidates.length === 0) {
      setQuickOrderMessage("暂时没有符合资格的陪玩，请调整游戏、性别或陪玩选择。");
      return;
    }

    setSelectedApplicant(null);
    setSelectedQuickPlaymate(null);
    setQuickOrderCandidates(candidates);
    setOvertimeMinutes(0);
    setProofUploaded(false);
    setReviewText("");
    setQuickOrderMessage("已找到符合资格的陪玩，请老板选择后确认下单。");
    setOrderStage("老板选择");
  };

  const moveToApplicantSelection = () => {
    setOrderStage("老板选择");
    setQuickOrderMessage("已收到陪玩申请，请从自介卡中选择喜欢的陪玩。");
  };

  const chooseQuickPlaymate = (playmate: Playmate) => {
    setSelectedQuickPlaymate(playmate);
    setOrderStage("付款");
    const baseCost = quickOrder.mode === "技术陪" && selectedRankPrice !== null
      ? Math.max(1, Math.ceil(selectedRankPrice * Math.max(1, Math.ceil(quickOrder.minutes / 30))))
      : getPlaymateOrderCoins(playmate, quickOrder.minutes);
    setQuickOrderMessage(`已选择 ${playmate.name}，本单需要 ${baseCost + getLateFee(quickOrder.startTime)} 金币。`);
  };

  const chooseApplicant = (applicant: Applicant) => {
    setSelectedApplicant(applicant);
    setOrderStage("付款");
    setQuickOrderMessage(`已选择 ${applicant.nickname}，付款后陪玩才会收到开始服务通知。`);
  };

  const payQuickOrder = async () => {
    if (!selectedQuickPlaymate) {
      setQuickOrderMessage("请先选择陪玩。");
      return;
    }

    if (coinBalance < quickOrderCost) {
      setQuickOrderMessage(`金币不足，本单需要 ${quickOrderCost} 金币，当前只有 ${coinBalance} 金币。请先到右上角充值。`);
      return;
    }

    const res = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playmateId: selectedQuickPlaymate.id,
        appointment: quickOrder.startTime,
        duration: quickOrder.minutes,
        note: quickOrder.note,
      }),
    });
    const data = await readJson<ApiResponse<{ coinCost?: number }>>(res);

    if (!res.ok) {
      setQuickOrderMessage(data?.error ?? "无法建立订单，请稍后再试。");
      return;
    }

    setCoinBalance(coinBalance - Number(data?.coinCost ?? quickOrderCost));
    window.dispatchEvent(new Event("ee-coins-updated"));
    window.dispatchEvent(new Event("ee-orders-updated"));
    setOrderStage("服务中");
    setQuickOrderMessage(`下单成功，已扣除 ${data?.coinCost ?? quickOrderCost} 金币。陪玩已收到通知，订单正式开始计时。`);
  };

  const finishQuickOrder = () => {
    setOrderStage("订单结束");
    setQuickOrderMessage("订单已结束，请完成评分和意见反馈。");
  };

  const resetQuickOrderFlow = () => {
    setQuickOrder(initialQuickOrder);
    setOrderStage("填写订单");
    setSelectedApplicant(null);
    setSelectedQuickPlaymate(null);
    setQuickOrderCandidates([]);
    setOvertimeMinutes(0);
    setShopRating(5);
    setPlaymateRating(5);
    setReviewText("");
    setProofUploaded(false);
    setQuickOrderMessage(null);
  };

  const closeBookingModal = () => {
    setBookingPlaymate(null);
    setBookingTime("");
    setBookingDuration(30);
    setBookingMessage(null);
    setIsBooking(false);
  };

  const handleEdit = (playmate: Playmate) => {
    if (!isAdmin) {
      setMessage("只有管理员可以编辑陪玩。");
      return;
    }

    setEditingId(playmate.id);
    setForm({
      name: playmate.name,
      game: playmate.game,
      price: String(playmate.price),
      role: playmate.role ?? "娱乐陪玩",
      description: playmate.description,
      image: playmate.image ?? "",
      ranks: (playmate.ranks ?? []).map((rank) => ({
        ...rank,
        key: `${rank.name}__${rank.price}__${rank.description ?? ""}`,
      })),
      newRankName: "",
      newRankPrice: "",
      newRankDescription: "",
    });
    setModalMessage(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!isAdmin) {
      setMessage("只有管理员可以删除陪玩。");
      return;
    }

    if (!window.confirm("确定删除这位陪玩资料吗？")) {
      return;
    }

    const res = await fetch(`/api/playmates/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      setMessage(data?.error ?? "无法删除陪玩资料。");
      return;
    }

    setMessage("陪玩资料已删除。");
    await fetchPlaymates();
  };

  const handleImageUpload = async (file: File | null) => {
    if (!file) {
      return;
    }

    const uploadForm = new FormData();
    uploadForm.append("image", file);
    setIsUploading(true);
    setModalMessage(null);

    try {
      const res = await fetch("/api/uploads", {
        method: "POST",
        body: uploadForm,
      });
      const data = await readJson<ApiResponse<{ url?: string }>>(res);

      if (!res.ok) {
        setModalMessage(data?.error ?? "图片上传失败。");
        return;
      }

      setForm((prev) => ({ ...prev, image: data?.url ?? "" }));
      setModalMessage("图片已上传。");
    } catch {
      setModalMessage("图片上传失败，请再试一次。");
    } finally {
      setIsUploading(false);
    }
  };

  const addRankOption = () => {
    const name = form.newRankName.trim();
    const price = Number(form.newRankPrice);
    const description = form.newRankDescription.trim();

    if (!name) {
      setModalMessage("请输入段位名。");
      return;
    }
    if (!Number.isInteger(price) || price <= 0) {
      setModalMessage("段位价格请输入大于 0 的整数。");
      return;
    }

    const newRank: RankOption = {
      key: `${name}__${price}__${description}`,
      name,
      price,
      description: description || undefined,
    };

    setForm((prev) => ({
      ...prev,
      ranks: [...prev.ranks, newRank].sort((a, b) => a.price - b.price || a.name.localeCompare(b.name)),
      newRankName: "",
      newRankPrice: "",
      newRankDescription: "",
    }));
    setModalMessage(null);
  };

  const removeRankOption = (key: string) => {
    setForm((prev) => ({
      ...prev,
      ranks: prev.ranks.filter((rank) => rank.key !== key),
    }));
  };

  const handleSubmit = async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();

    if (!form.name.trim() || !form.game.trim() || !form.price || !form.description.trim()) {
      setModalMessage("请填写昵称、游戏、价格和简介。");
      return;
    }

    if (form.role === "段位" && form.ranks.length === 0) {
      setModalMessage("段位类型陪玩需要至少添加一个段位价格。");
      return;
    }

    const price = Number(form.price);
    if (!Number.isInteger(price) || price <= 0) {
      setModalMessage("价格请输入大于 0 的整数。");
      return;
    }

    const url = editingId ? `/api/playmates/${editingId}` : "/api/playmates";
    const method = editingId ? "PUT" : "POST";
    setIsSaving(true);
    setModalMessage(null);

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          price,
        }),
      });
      const data = await readJson<ApiResponse>(res);

      if (!res.ok) {
        setModalMessage(data?.error ?? `无法保存陪玩资料。HTTP ${res.status}`);
        return;
      }

      setMessage(editingId ? "陪玩资料已更新。" : "陪玩资料已新增。");
      setSearch("");
      setSelectedGame("");
      closeModal();
      await fetchPlaymates();
    } catch {
      setModalMessage("无法保存陪玩资料，请再试一次。");
    } finally {
      setIsSaving(false);
    }
  };

  const handleBookAppointment = async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();

    if (!bookingPlaymate) {
      return;
    }

    if (status !== "authenticated") {
      void signIn("discord", { callbackUrl: "/playmate" });
      return;
    }

    if (!bookingTime || bookingDuration < 30) {
      setBookingMessage("请选择未来时间，服务时长至少 30 分钟。");
      return;
    }

    const appointmentDate = new Date(bookingTime);
    if (Number.isNaN(appointmentDate.getTime()) || appointmentDate <= new Date()) {
      setBookingMessage("预约时间必须是未来时间。");
      return;
    }

    if (coinBalance < bookingCost) {
      setBookingMessage(`金币不足，本单需要 ${bookingCost} 金币，当前只有 ${coinBalance} 金币。请先到右上角充值。`);
      return;
    }

    setIsBooking(true);
    setBookingMessage(null);

    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playmateId: bookingPlaymate.id,
          appointment: bookingTime,
          duration: bookingDuration,
        }),
      });
      const data = await readJson<ApiResponse<{ coinCost?: number }>>(res);

      if (!res.ok) {
        setBookingMessage(data?.error ?? "无法建立预约。");
        return;
      }

      setCoinBalance(coinBalance - Number(data?.coinCost ?? bookingCost));
      window.dispatchEvent(new Event("ee-coins-updated"));
      window.dispatchEvent(new Event("ee-orders-updated"));
      setMessage(`已向 ${bookingPlaymate.name} 送出预约申请，并扣除 ${data?.coinCost ?? bookingCost} 金币。`);
      closeBookingModal();
    } catch {
      setBookingMessage("无法建立预约，请再试一次。");
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-black text-white">
      <div className="pointer-events-none fixed inset-0 z-0">
        <video
          className="h-full w-full object-cover opacity-45"
          src="/image/playmate-lobby.mp4"
          autoPlay
          muted
          loop
          playsInline
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.18),transparent_38%),linear-gradient(to_bottom,rgba(0,0,0,0.18),rgba(0,0,0,0.72))]" />
      </div>

      <div className="relative z-20">
        <Navbar />
      </div>

      <div className="pointer-events-none fixed right-4 bottom-8 z-50 hidden flex-col items-center gap-2 md:flex">
        <a
          href="#quick-order"
          className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-cyan-400/15 text-cyan-200 shadow-xl shadow-cyan-500/20 ring-1 ring-cyan-300/20 transition hover:bg-cyan-400/30"
          aria-label="跳转到快速下单"
        >
          <span className="text-2xl leading-none animate-bounce">↓</span>
        </a>
        <span className="pointer-events-auto rounded-full bg-zinc-950/90 px-3 py-1 text-xs uppercase tracking-[0.18em] text-cyan-200 shadow-lg shadow-black/40">
          快速下单
        </span>
      </div>

      <div className="relative z-10 mx-auto flex max-w-7xl flex-col px-6 pb-12 pt-[5vh] md:pt-[9vh]">
        <section className="contents">
          <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">
              快速下单
            </p>
              <h1 className="mt-2 text-4xl font-bold">陪玩大厅</h1>
            </div>
            <p className="max-w-md text-sm leading-6 text-zinc-400">
              老板可以先快速下单，让多个陪玩申请接单，再选择自己喜欢的陪玩付款开始服务。
            </p>
          </div>

          <div id="quick-order" className="order-last mt-10 rounded-lg border border-cyan-300/40 bg-zinc-950/85 p-5 shadow-[0_0_42px_rgba(103,232,249,0.08)] backdrop-blur-md">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-300">
                  快速下单
                </p>
                <h2 className="mt-1 text-2xl font-bold">老板下单流程</h2>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-black px-4 py-3 text-sm text-zinc-300">
                预估金币：
                <span className="ml-2 font-black text-white">{Math.ceil(quickOrderPrice.total)} 金币</span>
                {quickOrderPrice.isNightOrder && (
                  <span className="ml-2 text-cyan-300">已含 5 金币夜单费</span>
                )}
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                    当前老板
                  </span>
                  <input
                    value={status === "authenticated" ? session?.user?.name ?? "Discord 老板" : "未登录"}
                    readOnly
                    className={fieldClass + " text-zinc-300"}
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                    选择陪玩
                  </span>
                  <select
                    value={quickOrder.playmateId}
                    onChange={(event) => updateQuickOrder("playmateId", event.target.value)}
                    className={fieldClass}
                  >
                    <option value="random">随机</option>
                    {playmates.map((playmate) => (
                      <option key={playmate.id} value={String(playmate.id)}>
                        {playmate.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                    性别
                  </span>
                  <select
                    value={quickOrder.gender}
                    onChange={(event) =>
                      updateQuickOrder("gender", event.target.value as GenderPreference)
                    }
                    className={fieldClass}
                  >
                    {genderOptions.map((gender) => (
                      <option key={gender} value={gender}>
                        {gender}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                    游戏
                  </span>
                  <select
                    value={quickOrder.game}
                    onChange={(event) => updateQuickOrder("game", event.target.value)}
                    className={fieldClass}
                  >
                    {gameOptions.map((game) => (
                      <option key={game} value={game}>
                        {game}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                    时间
                  </span>
                  <input
                    type="datetime-local"
                    value={quickOrder.startTime}
                    onChange={(event) => updateQuickOrder("startTime", event.target.value)}
                    className={fieldClass}
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                    {quickOrder.mode === "技术陪" ? "局数（每局按 30 分钟计算）" : "分钟"}
                  </span>
                  <input
                    value={quickOrder.mode === "技术陪" ? Math.max(1, Math.ceil(quickOrder.minutes / 30)) : quickOrder.minutes}
                    min={quickOrder.mode === "技术陪" ? "1" : "30"}
                    step={quickOrder.mode === "技术陪" ? "1" : "30"}
                    type="number"
                    onChange={(event) =>
                      updateQuickOrder(
                        "minutes",
                        quickOrder.mode === "技术陪"
                          ? Number(event.target.value) * 30
                          : Number(event.target.value),
                      )
                    }
                    className={fieldClass}
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                    服务模式
                  </span>
                  <select
                    value={quickOrder.mode}
                    onChange={(event) =>
                      updateQuickOrder("mode", event.target.value as ServiceMode)
                    }
                    className={fieldClass}
                  >
                    <option value="娱乐陪">娱乐陪</option>
                    <option value="技术陪">技术陪</option>
                  </select>
                </label>

                {quickOrder.mode === "技术陪" && rankOptions.length > 0 && (
                  <>
                    <label className="grid gap-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                        段位选择
                      </span>
                      <select
                        value={quickOrder.rankKey}
                        onChange={(event) => updateQuickOrder("rankKey", event.target.value)}
                        className={fieldClass}
                      >
                        <option value="">请选择段位...</option>
                        {rankOptions.map((rank) => (
                          <option key={rank.key} value={rank.key}>
                            {rank.name} - {rank.price} 金币/局{rank.description ? ` (${rank.description})` : ""}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="grid gap-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                        备注
                      </span>
                      <textarea
                        value={quickOrder.note}
                        onChange={(event) => updateQuickOrder("note", event.target.value)}
                        placeholder="例如：想轻松聊天、要会指挥、不要压力局"
                        className="min-h-[104px] rounded-lg border border-zinc-700 bg-black px-5 py-4 text-white outline-none transition placeholder:text-zinc-500 focus:border-cyan-300"
                      />
                    </label>
                  </>
                )}
              </div>

              <div className="rounded-lg border border-zinc-800 bg-black p-4">
                <p className="mb-3 text-sm font-semibold text-cyan-300">系统规则</p>
                <div className="grid gap-3 text-sm leading-6 text-zinc-300">
                  <p>选择随机时，系统会列出符合游戏和性别条件的陪玩。</p>
                  <p>选择指定陪玩时，只会弹出该陪玩卡片。</p>
                  <p>晚上 11:00PM 后订单自动增加 5 金币夜单费。</p>
                  <p>下单成功会扣除所需金币，金币不足时需要先充值。</p>
                </div>
                <button
                  type="button"
                  onClick={submitQuickOrder}
                  className="mt-5 w-full rounded-lg bg-white px-5 py-4 text-sm font-black text-black transition hover:bg-cyan-200 active:scale-95"
                >
                  下单并选择陪玩
                </button>
              </div>
            </div>

            {quickOrderMessage && (
              <p className="mt-4 rounded-lg border border-zinc-700 bg-black px-4 py-3 text-sm text-cyan-200">
                {quickOrderMessage}
              </p>
            )}

            <div className="mt-5 grid gap-3 md:grid-cols-5">
              {(["填写订单", "接单大厅", "老板选择", "付款", "服务中"] as OrderStage[]).map(
                (stage) => (
                  <div
                    key={stage}
                    className={`rounded-lg border px-3 py-3 text-center text-sm font-semibold ${
                      orderStage === stage
                        ? "border-cyan-300 bg-cyan-300 text-black"
                        : "border-zinc-800 bg-black text-zinc-400"
                    }`}
                  >
                    {stage}
                  </div>
                ),
              )}
            </div>

            {orderStage !== "填写订单" && (
              <div className="mt-5 rounded-lg border border-zinc-800 bg-black p-5">
                {orderStage === "接单大厅" && (
                  <div>
                    <h3 className="text-xl font-bold">陪玩接单大厅</h3>
                    <div className="mt-4 grid gap-3 text-sm text-zinc-300 md:grid-cols-5">
                      <p>游戏：{quickOrder.game}</p>
                      <p>陪玩：{quickOrder.playmateId === "random" ? "随机" : "指定"}</p>
                      <p>
                        {quickOrder.mode === "技术陪"
                          ? `局数：${Math.max(1, Math.ceil(quickOrder.minutes / 30))} 局`
                          : `时长：${quickOrder.minutes} 分钟`}
                      </p>
                      <p>夜单：{quickOrderPrice.isNightOrder ? "是" : "否"}</p>
                      <p>备注：{quickOrder.note || "无"}</p>
                    </div>
                    <button type="button" onClick={moveToApplicantSelection} className={primaryButton + " mt-5"}>
                      模拟多个陪玩申请接单
                    </button>
                  </div>
                )}

                {orderStage === "老板选择" && (
                  <div>
                    <h3 className="text-xl font-bold">老板选择陪玩</h3>
                    <p className="mt-2 text-sm text-zinc-400">
                      以下是符合资格的陪玩，选择后会显示本单需要的金币。
                    </p>
                    <div className="mt-5 grid gap-4 md:grid-cols-3">
                      {quickOrderCandidates.map((playmate) => (
                        <article key={playmate.id} className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                          <div className="flex items-center gap-3">
                            <div className="relative h-16 w-16 overflow-hidden rounded-lg bg-zinc-900">
                              {isValidImageSrc(playmate.image) ? (
                                <Image
                                  src={playmate.image as string}
                                  alt={playmate.name}
                                  fill
                                  sizes="64px"
                                  quality={100}
                                  unoptimized={playmate.image?.startsWith("http")}
                                  className="object-cover"
                                />
                              ) : (
                                <div className="grid h-full place-items-center text-xs text-zinc-500">暂无图片</div>
                              )}
                            </div>
                            <div>
                              <h4 className="font-bold">{playmate.name}</h4>
                              <p className="text-xs text-zinc-400">
                                {playmate.game}
                              </p>
                            </div>
                          </div>
                          <div className="mt-4 grid gap-2 text-sm text-zinc-300">
                            <p>
                              单价：{playmate.price} 金币 / {getPlaymateUnitLabel(playmate)}
                            </p>
                            <p>本单：{getPlaymateOrderCoins(playmate, quickOrder.minutes)} 金币</p>
                            <p className="leading-6">{playmate.description}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => chooseQuickPlaymate(playmate)}
                            className="mt-4 w-full rounded-lg bg-white px-4 py-3 text-sm font-bold text-black transition hover:bg-cyan-200"
                          >
                            选择这位陪玩
                          </button>
                        </article>
                      ))}
                    </div>
                  </div>
                )}

                {orderStage === "付款" && selectedQuickPlaymate && (
                  <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
                    <div>
                      <h3 className="text-xl font-bold">付款流程</h3>
                      <p className="mt-2 text-sm text-zinc-300">
                        已选择 {selectedQuickPlaymate.name}。付款成功后系统会通知陪玩「订单已付款，可开始服务」。
                      </p>
                      <p className="mt-2 text-sm text-zinc-400">
                        本单需要 {quickOrderCost} 金币，当前余额 {coinBalance} 金币
                        {quickOrderPrice.isNightOrder && "，已含夜单费 5 金币"}
                      </p>
                    </div>
                    <button type="button" onClick={payQuickOrder} className={primaryButton}>
                      支付 {quickOrderCost} 金币
                    </button>
                  </div>
                )}

                {orderStage === "服务中" && selectedQuickPlaymate && (
                  <div>
                    <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
                      <div>
                        <h3 className="text-xl font-bold">服务中</h3>
                        <p className="mt-2 text-sm text-zinc-300">
                          {selectedQuickPlaymate.name} 已开始服务，系统会自动记录开始时间与结束时间。
                        </p>
                      </div>
                      <button type="button" onClick={finishQuickOrder} className={primaryButton}>
                        结束订单
                      </button>
                    </div>
                    <div className="mt-5 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                      <h4 className="font-bold">超时续单机制</h4>
                      <p className="mt-2 text-sm text-zinc-400">
                        超时 15 分钟以上自动计算半小时费用；达到 1 小时计算 1 小时费用。
                      </p>
                      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                        <input
                          value={overtimeMinutes}
                          min="0"
                          type="number"
                          onChange={(event) => setOvertimeMinutes(Number(event.target.value))}
                          className={fieldClass + " flex-1"}
                          placeholder="超时分钟"
                        />
                        <div className="rounded-lg border border-zinc-700 px-4 py-3 text-sm">
                          续费金额：RM {overtimeFee.toFixed(2)}
                        </div>
                      </div>
                      {overtimeFee > 0 && (
                        <p className="mt-3 text-sm text-cyan-200">
                          系统会弹出续费付款提示；老板拒绝付款时，陪玩可选择结束订单。
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {orderStage === "订单结束" && (
                  <div>
                    <h3 className="text-xl font-bold">订单结束流程</h3>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <label className="grid gap-2">
                        <span className="text-sm text-zinc-400">陪玩评分</span>
                        <input
                          value={playmateRating}
                          min="1"
                          max="5"
                          type="number"
                          onChange={(event) => setPlaymateRating(Number(event.target.value))}
                          className={fieldClass}
                        />
                      </label>
                      <label className="grid gap-2">
                        <span className="text-sm text-zinc-400">店铺评分</span>
                        <input
                          value={shopRating}
                          min="1"
                          max="5"
                          type="number"
                          onChange={(event) => setShopRating(Number(event.target.value))}
                          className={fieldClass}
                        />
                      </label>
                      <label className="grid gap-2 md:col-span-2">
                        <span className="text-sm text-zinc-400">意见与改进建议</span>
                        <textarea
                          value={reviewText}
                          onChange={(event) => setReviewText(event.target.value)}
                          className="min-h-[100px] rounded-lg border border-zinc-700 bg-black px-5 py-4 text-white outline-none focus:border-cyan-300"
                          placeholder="填写体验反馈"
                        />
                      </label>
                    </div>
                    {quickOrder.mode === "技术陪" && (
                      <div className="mt-5 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                        <h4 className="font-bold">技术陪审核机制</h4>
                        <p className="mt-2 text-sm text-zinc-400">
                          技术陪订单结束后，需要上传战绩截图，例如 Valorant 战绩、CS2 Rating、MVP 或 KDA 数据。
                        </p>
                        <button
                          type="button"
                          onClick={() => setProofUploaded(true)}
                          className={darkButton + " mt-4"}
                        >
                          {proofUploaded ? "战绩截图已上传" : "上传战绩截图"}
                        </button>
                      </div>
                    )}
                    <button type="button" onClick={resetQuickOrderFlow} className={primaryButton + " mt-5"}>
                      完成并重新下单
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mb-8 flex max-w-2xl items-center rounded-lg border border-zinc-800 bg-zinc-950 p-2">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="搜索陪玩或游戏"
              className="min-h-10 flex-1 bg-transparent px-3 text-sm text-white outline-none placeholder:text-zinc-500"
            />
            <button type="button" className="rounded-md bg-white px-4 py-2 text-sm font-bold text-black transition hover:bg-cyan-200 active:scale-95">
              搜索
            </button>
            {(search || selectedGame) && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setSelectedGame("");
                }}
                className="ml-2 rounded-md border border-zinc-700 px-4 py-2 text-sm font-semibold text-white transition hover:border-cyan-300"
              >
                清除
              </button>
            )}
          </div>
        </section>

        <section className="mb-10">
          <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-300">
                游戏分类
              </p>
              <h2 className="text-2xl font-bold">选择游戏</h2>
            </div>
            <p className="text-sm text-zinc-400">
              正在显示 {filteredPlaymates.length} / {playmates.length} 位陪玩
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {gameCards.map((game) => {
              const isActive = selectedGame === game.name;

              return (
                <button
                  key={game.name}
                  type="button"
                  onClick={() => setSelectedGame(isActive ? "" : game.name)}
                  className={`group overflow-hidden rounded-lg border bg-zinc-950 text-left transition duration-200 hover:-translate-y-0.5 active:scale-[0.98] ${
                    isActive
                      ? "border-cyan-300 shadow-[0_0_32px_rgba(103,232,249,0.22)]"
                      : "border-zinc-800 hover:border-zinc-500"
                  }`}
                >
                  <div
                    className="h-20 bg-zinc-900 bg-cover bg-center transition duration-500 group-hover:scale-105 sm:h-24"
                    style={{
                      backgroundImage: `linear-gradient(to top, rgba(0, 0, 0, 0.45), transparent), url(${game.image})`,
                    }}
                    role="img"
                    aria-label={game.name}
                  />
                  <div className="p-3">
                    <h3 className="text-sm font-bold">{game.name}</h3>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <div className="mb-5">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-300">
              陪玩资料
            </p>
              <h2 className="text-3xl font-bold">可预约陪玩</h2>
          </div>

          {message && (
            <p className="mb-5 rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-cyan-200">
              {message}
            </p>
          )}

          {isLoading && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-8 text-center text-zinc-400">
              正在加载陪玩资料...
            </div>
          )}

          {!isLoading && filteredPlaymates.length > 0 && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
              {filteredPlaymates.map((playmate) => (
                <article
                  key={playmate.id}
                  className="group overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950/88 shadow-2xl shadow-black/40 backdrop-blur-md transition duration-200 hover:-translate-y-1 hover:border-cyan-300/70 hover:shadow-cyan-950/30"
                >
                  <div className="relative h-56 bg-zinc-900 text-zinc-500 md:h-64">
                    {isValidImageSrc(playmate.image) ? (
                      <Image
                        src={playmate.image as string}
                        alt={playmate.name}
                        fill
                        sizes="(min-width: 1280px) 360px, 33vw"
                        quality={100}
                        unoptimized={playmate.image?.startsWith("http")}
                        className="object-cover transition duration-500 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">暂无图片</div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/75 to-transparent" />
                  </div>

                  <div className="p-6 md:p-7">
                    <div className="mb-4 flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-2xl font-bold">{playmate.name}</h3>
                        <p className="mt-1 text-sm text-cyan-300">{playmate.game}</p>
                      </div>
                      <p className="rounded-lg border border-zinc-700 px-3 py-1 text-sm font-semibold">
                        RM {playmate.price} / {getPlaymateUnitLabel(playmate)}
                      </p>
                    </div>

                    <p className="mb-3 inline-flex rounded-lg border border-cyan-300/30 px-3 py-1 text-xs font-bold text-cyan-200">
                      {playmate.role}
                    </p>

                    <p className="mb-5 min-h-20 text-sm leading-6 text-zinc-300">
                      {playmate.description}
                    </p>

                    <button
                      type="button"
                      onClick={() => openBookingModal(playmate)}
                      className="mb-3 w-full rounded-lg bg-white px-5 py-4 text-sm font-black text-black transition duration-200 hover:-translate-y-0.5 hover:bg-cyan-200 active:scale-95"
                    >
                      立即预约
                    </button>

                    {isAdmin && (
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => handleEdit(playmate)}
                          className="flex-1 rounded-lg border border-zinc-700 px-4 py-3 text-sm font-semibold transition hover:border-cyan-300 hover:text-cyan-200 active:scale-95"
                        >
                          编辑
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(playmate.id)}
                          className="flex-1 rounded-lg border border-red-500/70 px-4 py-3 text-sm font-semibold text-red-300 transition hover:bg-red-500/10 active:scale-95"
                        >
                          删除
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}

          {!isLoading && filteredPlaymates.length === 0 && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-10 text-center">
              <h3 className="text-xl font-bold">没有找到陪玩</h3>
              <p className="mt-2 text-sm text-zinc-400">
                请尝试其他搜索，或新增一位陪玩资料。
              </p>
            </div>
          )}

          {isAdmin && (
            <div className="mt-10 flex justify-center">
              <button type="button" onClick={openCreateModal} className={primaryButton}>
                + 新增陪玩
              </button>
            </div>
          )}
        </section>
      </div>

      {isModalOpen && (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-black/80 px-4 py-8 backdrop-blur-md"
          onClick={closeModal}
        >
          <form
            onSubmit={handleSubmit}
            onClick={(event) => event.stopPropagation()}
            className="max-h-[88vh] w-full max-w-3xl origin-center overflow-y-auto rounded-lg border border-cyan-300/40 bg-zinc-950 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_30px_120px_rgba(0,0,0,0.8),0_0_60px_rgba(103,232,249,0.16)] animate-[playmateModalIn_180ms_ease-out]"
          >
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-300">
                  {editingId ? "编辑陪玩" : "新增陪玩"}
                </p>
                <h2 className="mt-1 text-2xl font-bold">
                  {editingId ? "更新陪玩资料" : "建立新的陪玩资料"}
                </h2>
              </div>
              <button type="button" onClick={closeModal} className={darkButton}>
                关闭
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                  昵称
                </span>
                <input
                  value={form.name}
                  onChange={(event) => handleChange("name", event.target.value)}
                  placeholder="例如：Nova"
                  className={fieldClass}
                />
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                  游戏
                </span>
                <input
                  value={form.game}
                  onChange={(event) => handleChange("game", event.target.value)}
                  placeholder="例如：Valorant"
                  className={fieldClass}
                />
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                  价格
                </span>
                <input
                  value={form.price}
                  type="number"
                  min="1"
                  step="1"
                  onChange={(event) => handleChange("price", event.target.value)}
                  placeholder="例如：30"
                  className={fieldClass}
                />
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                  类型
                </span>
                <select
                  value={form.role}
                  onChange={(event) => handleChange("role", event.target.value as PlaymateRole)}
                  className={fieldClass}
                >
                  {playmateRoleOptions.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </label>

              <div className="rounded-lg border border-zinc-700 bg-black p-4 md:row-span-2">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="relative flex h-28 w-full items-center justify-center overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 text-sm text-zinc-500 sm:w-36">
                    {isValidImageSrc(form.image) ? (
                      <Image
                        src={form.image}
                        alt="陪玩图片预览"
                        fill
                        sizes="144px"
                        quality={100}
                        unoptimized={form.image.startsWith("http")}
                        className="object-cover"
                      />
                    ) : (
                      "暂无图片"
                    )}
                  </div>

                  <div className="flex-1">
                    <label className={`inline-flex cursor-pointer ${primaryButton}`}>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        onChange={(event) => void handleImageUpload(event.target.files?.[0] ?? null)}
                        className="sr-only"
                      />
                      {isUploading ? "上传中..." : "上传图片"}
                    </label>
                    <p className="mt-3 text-xs text-zinc-500">支持 PNG、JPG、WEBP 或 GIF，最大 5MB。</p>
                  </div>
                </div>
              </div>

              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                  简介
                </span>
                <textarea
                  value={form.description}
                  onChange={(event) => handleChange("description", event.target.value)}
                  placeholder="简单介绍段位、定位、玩法或服务风格"
                  className="min-h-[126px] rounded-lg border border-zinc-700 bg-black px-5 py-4 text-white outline-none transition placeholder:text-zinc-500 focus:border-cyan-300"
                />
              </label>

              {form.role === "段位" && (
                <div className="md:col-span-2 space-y-4 rounded-lg border border-cyan-300/20 bg-black p-4">
                  <div className="grid gap-3 md:grid-cols-3">
                    <label className="grid gap-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                        段位名称
                      </span>
                      <input
                        value={form.newRankName}
                        onChange={(event) => handleChange("newRankName", event.target.value)}
                        placeholder="例如：青铜"
                        className={fieldClass}
                      />
                    </label>
                    <label className="grid gap-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                        价格
                      </span>
                      <input
                        type="number"
                        value={form.newRankPrice}
                        onChange={(event) => handleChange("newRankPrice", event.target.value)}
                        placeholder="例如：20"
                        className={fieldClass}
                      />
                    </label>
                    <label className="grid gap-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                        描述
                      </span>
                      <input
                        value={form.newRankDescription}
                        onChange={(event) => handleChange("newRankDescription", event.target.value)}
                        placeholder="例如：低阶入门"
                        className={fieldClass}
                      />
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={addRankOption}
                    className="w-full rounded-lg bg-white px-4 py-3 text-sm font-bold text-black transition hover:bg-cyan-200"
                  >
                    新增段位价格
                  </button>

                  {form.ranks.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-300">
                        已添加段位价格
                      </p>
                      <div className="grid gap-2">
                        {form.ranks.map((rank) => (
                          <div key={rank.key ?? `${rank.name}-${rank.price}`}
                            className="flex items-center justify-between gap-3 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-3 text-sm"
                          >
                            <div>
                              <p className="font-semibold text-white">
                                {rank.name} - {rank.price} 金币/局
                              </p>
                              {rank.description && (
                                <p className="text-xs text-zinc-400">{rank.description}</p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => removeRankOption(rank.key!)}
                              className="rounded-lg border border-red-500/70 px-3 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/10"
                            >
                              删除
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {modalMessage && (
              <p className="mt-4 rounded-lg border border-zinc-700 bg-black px-4 py-3 text-sm text-cyan-200">
                {modalMessage}
              </p>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={isSaving || isUploading}
                className={primaryButton}
              >
                {isSaving ? "保存中..." : editingId ? "保存修改" : "新增陪玩"}
              </button>
              <button type="button" onClick={closeModal} disabled={isSaving} className={darkButton}>
                取消
              </button>
            </div>
          </form>
        </div>
      )}

      {bookingPlaymate && showBookings && (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-black/80 px-4 py-8 backdrop-blur-md"
        >
          <form
            onSubmit={handleBookAppointment}
            className="w-full max-w-xl rounded-lg border border-cyan-300/40 bg-zinc-950 p-6 shadow-[0_30px_120px_rgba(0,0,0,0.8),0_0_60px_rgba(103,232,249,0.16)] animate-[playmateModalIn_180ms_ease-out]"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-300">
                  预约陪玩
                </p>
                <h2 className="mt-1 text-2xl font-bold">
                  {bookingPlaymate.name}
                </h2>
                <p className="mt-1 text-sm text-zinc-400">
                  {bookingPlaymate.game} / {bookingPlaymate.price} 金币每{getPlaymateUnitLabel(bookingPlaymate)}
                </p>
              </div>
              <button
                type="button"
                onClick={closeBookingModal}
                aria-label="关闭预约弹窗"
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-700 text-2xl leading-none text-zinc-200 transition hover:border-cyan-300 hover:text-white"
              >
                ×
              </button>
            </div>

            <div className="grid gap-4">
              <div className="rounded-lg border border-zinc-800 bg-black px-4 py-3 text-sm text-zinc-300">
                本单需要：
                <span className="ml-2 font-black text-yellow-200">{bookingCost} 金币</span>
                <span className="ml-3 text-zinc-500">当前 {coinBalance} 金币</span>
              </div>

              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                  预约时间
                </span>
                <input
                  type="datetime-local"
                  value={bookingTime}
                  onChange={(event) => setBookingTime(event.target.value)}
                  className={fieldClass}
                />
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                  {bookingPlaymate.role === "技术陪玩" ? "局数（每局按 30 分钟计算）" : "服务时长（分钟）"}
                </span>
                <input
                  value={bookingPlaymate.role === "技术陪玩" ? Math.max(1, Math.ceil(bookingDuration / 30)) : bookingDuration}
                  min={bookingPlaymate.role === "技术陪玩" ? "1" : "30"}
                  step={bookingPlaymate.role === "技术陪玩" ? "1" : "30"}
                  type="number"
                  onChange={(event) =>
                    setBookingDuration(
                      bookingPlaymate.role === "技术陪玩"
                        ? Number(event.target.value) * 30
                        : Number(event.target.value),
                    )
                  }
                  className={fieldClass}
                />
              </label>
            </div>

            {bookingMessage && (
              <p className="mt-4 rounded-lg border border-zinc-700 bg-black px-4 py-3 text-sm text-cyan-200">
                {bookingMessage}
              </p>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={isBooking}
                className="flex-1 rounded-lg bg-white px-5 py-4 text-sm font-black text-black transition duration-200 hover:bg-cyan-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isBooking ? "预约中..." : "确认预约"}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
