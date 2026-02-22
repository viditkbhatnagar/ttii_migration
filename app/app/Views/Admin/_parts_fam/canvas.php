<!-- top offcanvas -->
<div class="offcanvas offcanvas-top" tabindex="-1" id="offcanvasTop" aria-labelledby="offcanvasTopLabel" style="min-height: 38vh!important;">
    <div class="offcanvas-header bg-primary-subtle p-2">
        <h5 id="offcanvasTopLabel">Offcanvas Top</h5>
        <button type="button" class="btn-close text-reset" data-bs-dismiss="offcanvas" aria-label="Close"></button>
    </div>
    <div class="offcanvas-body">
        ...
    </div>
</div>

<!-- right offcanvas -->
<div class="offcanvas offcanvas-end" tabindex="-1" id="offcanvasRight" aria-labelledby="offcanvasRightLabel" style="min-width: 30%!important;">
    <div class="offcanvas-header bg-primary-subtle p-2">
        <h5 id="offcanvasRightLabel">Offcanvas Right</h5>
        <button type="button" class="btn-close text-reset" data-bs-dismiss="offcanvas" aria-label="Close"></button>
    </div>
    <div class="offcanvas-body">
        ...
    </div>
</div>

<!-- bottom offcanvas -->
<div class="offcanvas offcanvas-bottom" tabindex="-1" id="offcanvasBottom" aria-labelledby="offcanvasBottomLabel" style="min-height: 38vh!important;">
    <div class="offcanvas-header bg-primary-subtle p-2">
        <h5 id="offcanvasBottomLabel">Offcanvas Bottom</h5>
        <button type="button" class="btn-close text-reset" data-bs-dismiss="offcanvas" aria-label="Close"></button>
    </div>
    <div class="offcanvas-body">
        ...
    </div>
</div>

<!-- left offcanvas -->
<div class="offcanvas offcanvas-start" tabindex="-1" id="offcanvasLeft" aria-labelledby="offcanvasLeftLabel" style="min-width: 30%!important;">
    <div class="offcanvas-header bg-primary-subtle p-2">
        <h5 id="offcanvasLeftLabel">Offcanvas Left</h5>
        <button type="button" class="btn-close text-reset" data-bs-dismiss="offcanvas" aria-label="Close"></button>
    </div>
    <div class="offcanvas-body">
        ...
    </div>
</div>


<script>
    function canvas_top(url, header) {
        $('#offcanvasTop .offcanvas-body').html('<div style="padding:40px; text-align:center;"><img src="https://i.stack.imgur.com/FhHRx.gif"></div>');
        $('#offcanvasTopLabel').html('Loading...');
        $('#offcanvasTop').offcanvas('show');
        
        call_ajax_view(url, '#offcanvasTop .offcanvas-body');
        $('#offcanvasTopLabel').html(header);
    }

    function canvas_bottom(url, header) {
        $('#offcanvasBottom .offcanvas-body').html('<div style="padding:40px; text-align:center;"><img src="https://i.stack.imgur.com/FhHRx.gif"></div>');
        $('#offcanvasBottomLabel').html('Loading...');
        $('#offcanvasBottom').offcanvas('show');
        
        call_ajax_view(url, '#offcanvasBottom .offcanvas-body');
        $('#offcanvasBottomLabel').html(header);
    }

    function canvas_left(url, header) {
        $('#offcanvasLeft .offcanvas-body').html('<div style="padding:40px; text-align:center;"><img src="https://i.stack.imgur.com/FhHRx.gif"></div>');
        $('#offcanvasLeftLabel').html('Loading...');
        $('#offcanvasLeft').offcanvas('show');
        
        call_ajax_view(url, '#offcanvasLeft .offcanvas-body');
        $('#offcanvasLeftLabel').html(header);
    }

    function canvas_right(url, header) {
        $('#offcanvasRight .offcanvas-body').html('<div style="padding:40px; text-align:center;"><img src="https://i.stack.imgur.com/FhHRx.gif"></div>');
        $('#offcanvasRightLabel').html('Loading...');
        $('#offcanvasRight').offcanvas('show');
        
        call_ajax_view(url, '#offcanvasRight .offcanvas-body');
        $('#offcanvasRightLabel').html(header);
    }
</script>