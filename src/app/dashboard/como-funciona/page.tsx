import { Reveal } from "@/components/reveal"
import {
  Users,
  Trophy,
  Swords,
  Star,
  BarChart2,
  CalendarClock,
} from "lucide-react"

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
      <div className="mb-3 flex items-center gap-2">
        <Icon size={18} className="text-emerald-300" />
        <h3 className="font-[family-name:var(--font-display)] text-lg uppercase tracking-tight text-white">
          {title}
        </h3>
      </div>
      <div className="space-y-2 text-sm leading-relaxed text-white/70">{children}</div>
    </div>
  )
}

function Pts({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md bg-emerald-400/15 px-1.5 py-0.5 text-xs font-bold text-emerald-300">
      {children}
    </span>
  )
}

export default function ComoFuncionaPage() {
  return (
    <section className="w-full max-w-2xl">
      <Reveal>
        <h2 className="mb-2 font-[family-name:var(--font-display)] text-3xl uppercase tracking-tight">
          <span className="bg-gradient-to-r from-emerald-300 via-lime-200 to-cyan-300 bg-clip-text text-transparent">
            Cómo funciona
          </span>
        </h2>
        <p className="mb-6 text-sm text-white/40">
          Pronostica, suma puntos y pelea por la cima de la tabla. Aquí tienes todas las reglas.
        </p>
      </Reveal>

      <div className="grid gap-3">
        <Section icon={Users} title="1. Únete a un grupo">
          <p>
            Pide el <strong className="text-white/90">código de invitación</strong> a quien
            organiza tu porra y únete desde la pestaña <strong className="text-white/90">Grupos</strong>.
            Cada grupo tiene su propia tabla de posiciones; puedes estar en varios.
          </p>
        </Section>

        <Section icon={Trophy} title="2. Pronostica la fase de grupos">
          <p>
            En <strong className="text-white/90">Pronósticos</strong> verás los 72 partidos de la
            fase de grupos. Pon el <strong className="text-white/90">marcador</strong> que crees que
            quedará en cada uno.
          </p>
          <p>
            Cada partido se <strong className="text-white/90">cierra 15 minutos antes de su
            hora de inicio</strong>: a partir de ahí ya no puedes cambiar ese pronóstico. Cuando
            termina, verás el resultado real, tu pronóstico y los puntos que ganaste.
          </p>
        </Section>

        <Section icon={BarChart2} title="3. Puntuación">
          <p className="font-medium text-white/90">Fase de grupos (por marcador):</p>
          <ul className="ml-1 space-y-1">
            <li>· Marcador exacto: <Pts>5 pts</Pts></li>
            <li>· Resultado acertado (ganador o empate), pero marcador distinto: <Pts>3 pts</Pts></li>
            <li>· Fallo: <Pts>0 pts</Pts></li>
          </ul>

          <p className="mt-3 font-medium text-white/90">Eliminatorias (por acertar quién avanza):</p>
          <ul className="ml-1 space-y-1">
            <li>· Dieciseisavos: <Pts>3 pts</Pts> por equipo acertado</li>
            <li>· Octavos: <Pts>5 pts</Pts></li>
            <li>· Cuartos: <Pts>8 pts</Pts></li>
            <li>· Semifinales: <Pts>12 pts</Pts></li>
            <li>· Final (campeón): <Pts>20 pts</Pts></li>
            <li>· Tercer puesto: <Pts>6 pts</Pts></li>
          </ul>

          <p className="mt-3 font-medium text-white/90">Apuestas especiales:</p>
          <ul className="ml-1 space-y-1">
            <li>· Máximo goleador: <Pts>10 pts</Pts></li>
            <li>· MVP del Mundial: <Pts>12 pts</Pts></li>
            <li>· Mejor portero: <Pts>8 pts</Pts></li>
          </ul>
          <p className="mt-1 text-xs text-white/40">
            (El campeón ya lo pronosticas en el cuadro de eliminatorias.)
          </p>
        </Section>

        <Section icon={Swords} title="4. El cuadro de eliminatorias">
          <p>
            <strong className="text-white/90">Se desbloquea al terminar la fase de grupos</strong>,
            cuando se conocen los cruces reales de dieciseisavos.
          </p>
          <p>
            Entonces rellenas <strong className="text-white/90">todo el cuadro de una vez</strong>:
            eliges <strong className="text-white/90">quién avanza</strong> en cada llave y va subiendo
            ronda a ronda hasta coronar campeón. Aquí <strong className="text-white/90">no se ponen
            marcadores</strong>, solo quién pasa.
          </p>
          <p>
            El cuadro se <strong className="text-white/90">cierra 15 minutos antes del primer
            partido de dieciseisavos</strong>, así que rellénalo antes.
          </p>
        </Section>

        <Section icon={Star} title="5. Apuestas especiales">
          <p>
            En <strong className="text-white/90">Apuestas</strong> eliges
            <strong className="text-white/90"> máximo goleador</strong>,
            <strong className="text-white/90"> MVP del Mundial</strong> y
            <strong className="text-white/90"> mejor portero</strong>.
            Se cierran <strong className="text-white/90">antes del primer partido del Mundial</strong>.
          </p>
        </Section>

        <Section icon={BarChart2} title="6. La tabla">
          <p>
            Tu puntuación total suma <strong className="text-white/90">fase de grupos + eliminatorias
            + apuestas especiales</strong>. La tabla de cada grupo se actualiza a medida que se cierran
            los partidos. ¡A por el primer puesto!
          </p>
        </Section>

        <Section icon={CalendarClock} title="Fechas clave">
          <ul className="ml-1 space-y-1">
            <li>· <strong className="text-white/90">11 de junio de 2026</strong>: arranca el Mundial y la fase de grupos.</li>
            <li>· Cierre de cada partido: <strong className="text-white/90">15 min antes</strong> de su hora de inicio.</li>
            <li>· Cierre de apuestas especiales: <strong className="text-white/90">antes del primer partido</strong>.</li>
            <li>· Cuadro de eliminatorias: se abre <strong className="text-white/90">al acabar los grupos</strong> y se cierra 15 min antes del primer dieciseisavos.</li>
          </ul>
        </Section>
      </div>
    </section>
  )
}
