import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.empresa.bingo.entity.BingoSolicitacao;

@Repository
public interface BingoSolicitacaoRepository extends JpaRepository<BingoSolicitacao, Long> {
    // Additional query methods can be defined here if needed
}