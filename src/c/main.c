#include <pebble.h>

static Window *s_window;
static TextLayer *s_text_layer;
static Layer *s_path_layer, *s_label_layer;
static uint8_t s_path_points[80];
static int s_num_points = 0;

typedef enum { id_data = 0, id_path_data = 1, id_button = 3, id_vibe = 4 } TupleKeys;

static void send_btn(int id) {
  DictionaryIterator *iter;
  if (app_message_outbox_begin(&iter) == APP_MSG_OK) {
    dict_write_int(iter, id_button, &id, 4, true);
    app_message_outbox_send();
  }
}

static void up_h(ClickRecognizerRef r, void *c) { send_btn(1); }
static void sl_h(ClickRecognizerRef r, void *c) { send_btn(0); }
static void dn_h(ClickRecognizerRef r, void *c) { send_btn(2); }

static void click_config_provider(void *context) {
  window_single_click_subscribe(BUTTON_ID_UP, up_h);
  window_single_click_subscribe(BUTTON_ID_SELECT, sl_h);
  window_single_click_subscribe(BUTTON_ID_DOWN, dn_h);
}

static void label_update_proc(Layer *layer, GContext *ctx) {
  graphics_context_set_text_color(ctx, GColorWhite);
  // P = Pause/Play, R = Reset, L = Laps (Info)
  graphics_draw_text(ctx, "P", fonts_get_system_font(FONT_KEY_GOTHIC_14), GRect(135, 12, 10, 20), GTextOverflowModeFill, GTextAlignmentCenter, NULL);
  graphics_draw_text(ctx, "R", fonts_get_system_font(FONT_KEY_GOTHIC_14), GRect(135, 76, 10, 20), GTextOverflowModeFill, GTextAlignmentCenter, NULL);
  graphics_draw_text(ctx, "L", fonts_get_system_font(FONT_KEY_GOTHIC_14), GRect(135, 142, 10, 20), GTextOverflowModeFill, GTextAlignmentCenter, NULL);
}

static void path_update_proc(Layer *layer, GContext *ctx) {
  GRect bounds = layer_get_bounds(layer);
  graphics_context_set_fill_color(ctx, GColorWhite);
  graphics_fill_rect(ctx, bounds, 0, GCornerNone);
  if (s_num_points < 4) return;
  graphics_context_set_stroke_color(ctx, GColorBlack);
  graphics_context_set_stroke_width(ctx, 2);
  for (int i = 0; i < s_num_points - 2; i += 2) {
    graphics_draw_line(ctx, GPoint(s_path_points[i], s_path_points[i+1]), GPoint(s_path_points[i+2], s_path_points[i+3]));
  }
}

static void in_received_handler(DictionaryIterator *iter, void *context) {
  Tuple *t_text = dict_find(iter, id_data);
  if (t_text) text_layer_set_text(s_text_layer, t_text->value->cstring);
  Tuple *t_path = dict_find(iter, id_path_data);
  if (t_path) {
    s_num_points = t_path->length;
    memcpy(s_path_points, t_path->value->data, s_num_points > 80 ? 80 : s_num_points);
    layer_mark_dirty(s_path_layer);
  }
  Tuple *t_vibe = dict_find(iter, id_vibe);
  if (t_vibe && t_vibe->value->int32 == 1) vibes_long_pulse();
}

static void window_load(Window *window) {
  Layer *root = window_get_root_layer(window);
  window_set_background_color(window, GColorBlack);
  
  s_text_layer = text_layer_create(GRect(5, 5, 130, 100));
  text_layer_set_background_color(s_text_layer, GColorBlack);
  text_layer_set_text_color(s_text_layer, GColorWhite);
  text_layer_set_font(s_text_layer, fonts_get_system_font(FONT_KEY_GOTHIC_24_BOLD));
  text_layer_set_text_alignment(s_text_layer, GTextAlignmentLeft);
  text_layer_set_text(s_text_layer, "GPS...");
  layer_add_child(root, text_layer_get_layer(s_text_layer));

  s_path_layer = layer_create(GRect(10, 105, 120, 55));
  layer_set_update_proc(s_path_layer, path_update_proc);
  layer_add_child(root, s_path_layer);

  s_label_layer = layer_create(GRect(0, 0, 144, 168));
  layer_set_update_proc(s_label_layer, label_update_proc);
  layer_add_child(root, s_label_layer);
}

static void init() {
  s_window = window_create();
  window_set_click_config_provider(s_window, click_config_provider);
  window_set_window_handlers(s_window, (WindowHandlers) { .load = window_load, .unload = (WindowHandler)text_layer_destroy });
  app_message_register_inbox_received(in_received_handler);
  app_message_open(1024, 64);
  window_stack_push(s_window, true);
}

int main() { init(); app_event_loop(); window_destroy(s_window); }