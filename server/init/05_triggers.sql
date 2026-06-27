-- Triggers (public + auth + storage)

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER trg_folders_updated_at BEFORE UPDATE ON public.folders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_items_updated_at BEFORE UPDATE ON public.items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS trg_items_fill_team_id ON public.items;
CREATE TRIGGER trg_items_fill_team_id BEFORE INSERT ON public.items FOR EACH ROW EXECUTE FUNCTION public.items_fill_team_id();
CREATE TRIGGER set_pick_list_issues_updated_at BEFORE UPDATE ON public.pick_list_issues FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_pick_lists_updated_at BEFORE UPDATE ON public.pick_lists FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_purchase_orders_updated_at BEFORE UPDATE ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_stock_counts_updated_at BEFORE UPDATE ON public.stock_counts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- storage.* triggers are system-managed by Supabase; listed for reference only:
-- enforce_bucket_name_length_trigger (storage.buckets INSERT/UPDATE)
-- protect_buckets_delete (storage.buckets DELETE, STATEMENT)
-- protect_objects_delete (storage.objects DELETE, STATEMENT)
-- update_objects_updated_at (storage.objects BEFORE UPDATE)
