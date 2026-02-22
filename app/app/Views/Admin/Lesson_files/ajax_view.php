<?php
    if (isset($view_data)){
        ?>
        
        <h5>Title : <?=$view_data['title']?></h5>
        <p>
            Summary : <br>
            <div class="editor-content">
            <?=$view_data['summary']?>
                
            </div>
        </p>
        
        <?php
    }
?>
