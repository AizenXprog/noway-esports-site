-- GRI pode ler a Equipe, enviar mensagens e consultar dados internos como jogador.
-- Gestao continua restrita aos cargos owner/manager em noway_can_manage_team().
CREATE OR REPLACE FUNCTION public.noway_is_team_staff()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.noway_profiles p
    WHERE p.id=(SELECT auth.uid()) AND p.role IN ('owner','manager','jogador','gri')
  );
$function$;
