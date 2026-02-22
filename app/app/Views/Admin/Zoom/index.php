<div class="row">
    <div class="col-xl-12">
        <div class="card">
            <div class="card-body">
                <h4 class="page-title"> <i class="mdi mdi-apple-keyboard-command title_icon"></i> <?=$page_title?></h4>
                <div class="p-4 mx-auto" style="max-width: 500px;">
                    <?php 
                    if(isset($live_class)){
                        ?>
                        <form action="<?=base_url('zoom/start')?>" method="get">
                            <input type="hidden" name="live_class_id" value="<?php echo $live_class['id']; ?>">
                            <!--<input type="hidden" name="live_class_id" value="">-->
                            <div class="form-group">
                                <label for="class_title">Live Class Title <span class="text-danger">*</span> </label>
                                <input style="background-color:#f2f2f2" type="text" class="form-control" id="class_title" name="class_title" value="<?php echo strtoupper($live_class['title']); ?>" required readonly>
                                <div class="pt-3">
                                    <input type="checkbox" value="1" name="preview" id="preview" style="width: 18px;height: 18px;margin-right: 5px;" checked>
                                    <label for="preview" style="font-size: 18px;">Preview Video Before Start</label>
                                </div>
                                <div class="text-center p-2 mt-2">
                                    <button type="submit" class="btn btn-primary" style="width: 200px">Start Host</button>
                                </div>
                            </div>
                        </form>
                        <?php
                    }
                    ?>
                    
                </div>
            </div> <!-- end card body-->
        </div> <!-- end card -->
    </div><!-- end col-->
</div>



