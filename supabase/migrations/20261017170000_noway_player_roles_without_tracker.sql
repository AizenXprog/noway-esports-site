-- NOWAY ID / 2026-10-17
-- Corrige promoção de Jogador: o Founder decide o cargo; a conta vincula o Tracker depois.
-- Aplicado no Supabase por migração: decouple_player_role_assignment_from_tracker_link_20261017.
CREATE OR REPLACE FUNCTION public.noway_set_member_role(target_id uuid, next_role public.noway_role)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
BEGIN
  IF (SELECT auth.uid()) IS NULL OR NOT public.noway_is_owner() THEN
    RAISE EXCEPTION 'Somente o Founder pode atribuir cargos' USING errcode='42501';
  END IF;
  IF target_id IS NULL OR next_role IS NULL OR next_role NOT IN ('membro','jogador','manager','gri') THEN
    RAISE EXCEPTION 'Cargo ou conta inválidos' USING errcode='22023';
  END IF;
  IF EXISTS (SELECT 1 FROM public.noway_profiles WHERE id=target_id AND role='owner') THEN
    RAISE EXCEPTION 'Não é possível alterar o Founder' USING errcode='42501';
  END IF;
  UPDATE public.noway_profiles SET role=next_role WHERE id=target_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Conta não encontrada' USING errcode='P0002'; END IF;
END;
$function$;
REVOKE ALL ON FUNCTION public.noway_set_member_role(uuid,public.noway_role) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.noway_set_member_role(uuid,public.noway_role) TO authenticated;
